// =====================================================================
// Small shared presentational components used across public pages.
// =====================================================================

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true
}: {
  eyebrow?: string
  title: string
  subtitle?: string | JSX.Element
  center?: boolean
}) {
  return (
    <div class={`max-w-2xl ${center ? 'mx-auto text-center' : ''} mb-12 reveal`}>
      {eyebrow ? (
        <span class="inline-block text-xs font-bold tracking-widest uppercase text-brand-red bg-red-50 px-3 py-1 rounded-full mb-3">
          {eyebrow}
        </span>
      ) : null}
      <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-brand-blue leading-tight">{title}</h2>
      {subtitle ? <p class="text-slate-500 mt-3 text-base sm:text-lg">{subtitle}</p> : null}
    </div>
  )
}

export function StatCounter({ value, suffix = '+', label, icon }: { value: number; suffix?: string; label: string; icon: string }) {
  return (
    <div class="text-center reveal">
      <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
        <i class={`fa-solid ${icon} text-2xl text-brand-red`}></i>
      </div>
      <div class="stat-number text-3xl sm:text-4xl font-extrabold text-white font-display">
        <span data-counter={value} data-suffix={suffix}>
          0{suffix}
        </span>
      </div>
      <p class="text-slate-300 text-sm mt-1">{label}</p>
    </div>
  )
}

export function StarRating({ rating }: { rating: number }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    stars.push(<i class={`fa-solid fa-star ${i <= rating ? 'text-amber-400' : 'text-slate-200'}`}></i>)
  }
  return <div class="flex gap-0.5">{stars}</div>
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" class="text-sm">
      <ol class="flex flex-wrap items-center gap-2 text-slate-500">
        {items.map((item, i) => (
          <li class="flex items-center gap-2">
            {item.href ? (
              <a href={item.href} class="hover:text-brand-red">
                {item.label}
              </a>
            ) : (
              <span class="text-slate-700 font-medium">{item.label}</span>
            )}
            {i < items.length - 1 ? <i class="fa-solid fa-chevron-right text-[10px] text-slate-300"></i> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHero({
  title,
  subtitle,
  breadcrumbs
}: {
  title: string
  subtitle?: string
  breadcrumbs: { label: string; href?: string }[]
}) {
  return (
    <section class="hero-gradient pt-10 pb-16 sm:pt-14 sm:pb-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-4 text-slate-300">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        <h1 class="font-display text-3xl sm:text-5xl font-extrabold text-white max-w-3xl leading-tight">{title}</h1>
        {subtitle ? <p class="text-slate-300 mt-4 max-w-2xl text-base sm:text-lg">{subtitle}</p> : null}
      </div>
    </section>
  )
}
