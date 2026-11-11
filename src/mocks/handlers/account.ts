import { http, HttpResponse } from 'msw'
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  Session,
  UpdateProfileRequest,
  UpsertWalletRequest,
  Wallet,
} from '@/api/contracts'
import { db, hashPassword, mutate, nextId, toPublicUser } from '../db'
import { apiError, isScenario, simulateNetwork } from '../scenarios'
import { API, EMAIL_RE, ETH_ADDRESS_RE, authenticate, runtime, validatePassword } from '../support'

function createSession(userId: string): Session {
  const user = db().users.find((u) => u.id === userId)!
  const token = `tok_${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + runtime.sessionTtlMs).toISOString()
  mutate((s) => {
    s.sessions.push({ token, userId, expiresAt })
  })
  return { user: toPublicUser(user), token, expiresAt }
}

const WALLET_PROVIDERS = ['metamask', 'coinbase', 'walletconnect', 'phantom']
const CHAINS = ['ethereum', 'polygon', 'solana']
const MAX_AVATAR_CHARS = 1_500_000 // ~1MB em data URL

export const accountHandlers = [
  // ---------- Sessão ----------
  http.post(`${API}/auth/register`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const body = (await request.json()) as RegisterRequest
    const fields: Record<string, string> = {}
    if (!body.name || body.name.trim().length < 2) fields.name = 'Informe seu nome (mín. 2 caracteres).'
    if (!EMAIL_RE.test(body.email ?? '')) fields.email = 'Informe um e-mail válido.'
    const pwErr = validatePassword(body.password ?? '')
    if (pwErr) fields.password = pwErr
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', fields)

    const email = body.email.trim().toLowerCase()
    if (db().users.some((u) => u.email === email))
      return apiError(409, 'CONFLICT', 'Este e-mail já está cadastrado.', { email: 'Este e-mail já está cadastrado.' })

    const id = nextId('user')
    const salt = `salt-${id}`
    const passwordHash = await hashPassword(body.password, salt)
    mutate((s) => {
      s.users.push({
        id,
        name: body.name.trim(),
        email,
        username: email.split('@')[0].replace(/[^a-z0-9.]/g, ''),
        bio: '',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        salt,
        passwordHash,
      })
      s.favorites[id] = []
      s.wallets[id] = []
    })
    return HttpResponse.json(createSession(id), { status: 201 })
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const body = (await request.json()) as LoginRequest
    const fields: Record<string, string> = {}
    if (!EMAIL_RE.test(body.email ?? '')) fields.email = 'Informe um e-mail válido.'
    if (!body.password) fields.password = 'Informe sua senha.'
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', fields)

    const user = db().users.find((u) => u.email === body.email.trim().toLowerCase())
    const ok = user && (await hashPassword(body.password, user.salt)) === user.passwordHash
    if (!user || !ok) return apiError(401, 'UNAUTHENTICATED', 'E-mail ou senha incorretos.')
    return HttpResponse.json(createSession(user.id))
  }),

  http.get(`${API}/auth/session`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const s = db().sessions.find((x) => x.token === auth.token)!
    return HttpResponse.json<Session>({ user: toPublicUser(auth.user), token: auth.token, expiresAt: s.expiresAt })
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    await simulateNetwork()
    const token = request.headers.get('authorization')?.slice(7)
    mutate((s) => {
      s.sessions = s.sessions.filter((x) => x.token !== token)
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- Perfil ----------
  http.get(`${API}/me`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json(toPublicUser(auth.user))
  }),

  http.put(`${API}/me`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const body = (await request.json()) as UpdateProfileRequest
    const fields: Record<string, string> = {}
    if (!body.name || body.name.trim().length < 2) fields.name = 'Informe seu nome (mín. 2 caracteres).'
    if (!/^[a-z0-9._]{3,20}$/.test(body.username ?? ''))
      fields.username = 'Use 3–20 caracteres: letras minúsculas, números, ponto ou _.'
    if (!EMAIL_RE.test(body.email ?? '')) fields.email = 'Informe um e-mail válido.'
    if ((body.bio ?? '').length > 280) fields.bio = 'A bio deve ter no máximo 280 caracteres.'
    if (body.avatarUrl && !body.avatarUrl.startsWith('data:image/') && !body.avatarUrl.startsWith('/'))
      fields.avatarUrl = 'Formato de imagem inválido.'
    if (body.avatarUrl && body.avatarUrl.length > MAX_AVATAR_CHARS) fields.avatarUrl = 'A imagem deve ter no máximo 1 MB.'
    const email = (body.email ?? '').trim().toLowerCase()
    if (!fields.email && db().users.some((u) => u.email === email && u.id !== auth.user.id))
      fields.email = 'Este e-mail já está em uso.'
    if (!fields.username && db().users.some((u) => u.username === body.username && u.id !== auth.user.id))
      fields.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(fields).length) return apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', fields)

    const updated = mutate((s) => {
      const u = s.users.find((x) => x.id === auth.user.id)!
      Object.assign(u, { name: body.name.trim(), username: body.username, email, bio: body.bio ?? '', avatarUrl: body.avatarUrl })
      return u
    })
    return HttpResponse.json(toPublicUser(updated))
  }),

  http.post(`${API}/me/password`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const body = (await request.json()) as ChangePasswordRequest
    const currentOk = (await hashPassword(body.currentPassword ?? '', auth.user.salt)) === auth.user.passwordHash
    if (!currentOk)
      return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' })
    const pwErr = validatePassword(body.newPassword ?? '')
    if (pwErr) return apiError(422, 'VALIDATION_ERROR', pwErr, { newPassword: pwErr })
    if (body.newPassword === body.currentPassword)
      return apiError(422, 'VALIDATION_ERROR', 'A nova senha deve ser diferente da atual.', {
        newPassword: 'A nova senha deve ser diferente da atual.',
      })
    const hash = await hashPassword(body.newPassword, auth.user.salt)
    mutate((s) => {
      s.users.find((x) => x.id === auth.user.id)!.passwordHash = hash
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // ---------- Carteiras ----------
  http.get(`${API}/wallets`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    return HttpResponse.json(db().wallets[auth.user.id] ?? [])
  }),

  http.post(`${API}/wallets`, async ({ request }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const body = (await request.json()) as UpsertWalletRequest
    const list = db().wallets[auth.user.id] ?? []
    if (list.length >= 2)
      return apiError(409, 'CONFLICT', 'Você já possui carteiras principal e secundária. Edite uma existente.')
    const err = validateWallet(body, list, null)
    if (err) return err
    const wallet: Wallet = { id: nextId('wallet'), ...body, isPrimary: list.length === 0 ? true : body.isPrimary }
    mutate((s) => {
      const arr = (s.wallets[auth.user.id] ??= [])
      if (wallet.isPrimary) arr.forEach((w) => (w.isPrimary = false))
      arr.push(wallet)
    })
    return HttpResponse.json(wallet, { status: 201 })
  }),

  http.put(`${API}/wallets/:id`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const list = db().wallets[auth.user.id] ?? []
    const existing = list.find((w) => w.id === params.id)
    if (!existing) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    const body = (await request.json()) as UpsertWalletRequest
    const err = validateWallet(body, list, existing.id)
    if (err) return err
    if (existing.isPrimary && !body.isPrimary && list.length === 1)
      return apiError(422, 'VALIDATION_ERROR', 'Você precisa ter uma carteira principal.', {
        isPrimary: 'Você precisa ter uma carteira principal.',
      })
    const updated = mutate((s) => {
      const arr = s.wallets[auth.user.id]
      if (body.isPrimary) arr.forEach((w) => (w.isPrimary = false))
      const w = arr.find((x) => x.id === existing.id)!
      Object.assign(w, body)
      // Garante exatamente uma principal
      if (!arr.some((x) => x.isPrimary)) (arr.find((x) => x.id !== w.id) ?? w).isPrimary = true
      return w
    })
    return HttpResponse.json(updated)
  }),

  http.post(`${API}/wallets/:id/connect`, async ({ request, params }) => {
    const fail = await simulateNetwork()
    if (fail) return fail
    const auth = authenticate(request)
    if ('response' in auth) return auth.response
    const wallet = (db().wallets[auth.user.id] ?? []).find((w) => w.id === params.id)
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (isScenario('wallet-refused')) return apiError(403, 'FORBIDDEN', 'A conexão foi recusada na carteira.')
    return HttpResponse.json({ walletId: wallet.id, status: 'connected', sessionId: `wc_${wallet.id}` })
  }),
]

function validateWallet(body: UpsertWalletRequest, list: Wallet[], selfId: string | null) {
  const fields: Record<string, string> = {}
  if (!body.label || body.label.trim().length < 2) fields.label = 'Informe um nome para a carteira.'
  if (!WALLET_PROVIDERS.includes(body.provider)) fields.provider = 'Selecione um provedor.'
  if (!CHAINS.includes(body.network)) fields.network = 'Selecione uma rede.'
  if (!ETH_ADDRESS_RE.test(body.address ?? '')) fields.address = 'Endereço inválido (0x + 40 caracteres hexadecimais).'
  else if (list.some((w) => w.address.toLowerCase() === body.address.toLowerCase() && w.id !== selfId))
    fields.address = 'Este endereço já está cadastrado.'
  return Object.keys(fields).length ? apiError(422, 'VALIDATION_ERROR', 'Verifique os campos.', fields) : null
}

