import type { SVGProps } from 'react'

/**
 * Ícones de marcas (redes sociais e provedores de login). O lucide-react não
 * distribui logotipos de terceiros, então os glifos ficam aqui, em SVG inline.
 */

type IconProps = SVGProps<SVGSVGElement>

const base = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" />
    </svg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.6" cy="7.4" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function TwitterIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M22 5.9c-.7.3-1.5.5-2.4.6.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5 0 2 1.4 3.700 3.300 4.100-.6.2-1.2.2-1.8.1.5 1.600 2 2.800 3.800 2.800A8.200 8.200 0 0 1 2 18.300a11.600 11.600 0 0 0 6.300 1.800c7.500 0 11.700-6.300 11.700-11.700v-.5c.8-.6 1.500-1.300 2-2z" />
    </svg>
  )
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" {...props}>
      <path d="M6.500 8.500H3.600V20h2.900zM5 3.500a1.700 1.700 0 1 0 0 3.400 1.700 1.700 0 0 0 0-3.400zM20.400 20v-6.300c0-3.100-1.600-4.500-3.800-4.500-1.800 0-2.600 1-3 1.700V8.500h-2.900V20h2.900v-6.400c0-1.400.6-2.400 2-2.400 1.300 0 1.900 1 1.900 2.400V20z" />
    </svg>
  )
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="3.5" />
      <path d="M10.500 9.700v4.600l4-2.300z" fill="currentColor" />
    </svg>
  )
}

/** "G" do Google nas cores oficiais (botão "Continuar com Google"). */
export function GoogleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path fill="#4285F4" d="M22.560 12.250c0-.780-.070-1.530-.200-2.250H12v4.260h5.920c-.260 1.370-1.040 2.530-2.210 3.310v2.770h3.570c2.080-1.920 3.280-4.740 3.280-8.090z" />
      <path fill="#34A853" d="M12 23c2.970 0 5.460-.980 7.280-2.660l-3.570-2.770c-.980.660-2.230 1.060-3.710 1.060-2.860 0-5.290-1.930-6.160-4.530H2.180v2.840C3.990 20.530 7.700 23 12 23z" />
      <path fill="#FBBC05" d="M5.840 14.090c-.220-.660-.350-1.360-.350-2.090s.130-1.430.350-2.090V7.070H2.180C1.430 8.550 1 10.220 1 12s.430 3.450 1.180 4.930l2.850-2.220.810-.620z" />
      <path fill="#EA4335" d="M12 5.380c1.620 0 3.060.560 4.210 1.640l3.150-3.150C17.450 2.090 14.970 1 12 1 7.700 1 3.990 3.470 2.180 7.070l3.660 2.840c.870-2.600 3.300-4.530 6.160-4.530z" />
    </svg>
  )
}
