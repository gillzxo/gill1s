// =====================================================================
// Admin portal layout — sidebar nav, topbar with logged-in user, and a
// content slot. Rendered manually (not via the public jsxRenderer) so
// the admin portal has its own lightweight, dashboard-style chrome.
// =====================================================================
import type { AdminSessionUser } from '../lib/auth'

interface AdminLayoutProps {
  title: string
  user: AdminSessionUser
  activeNav: string
  children: JSX.Element | JSX.Element[] | string
}

const NAV_ITEMS = [
  { key: 'dashboard', href: '/admin', icon: 'fa-gauge', label: 'Dashboard' },
  { key: 'enquiries', href: '/admin/enquiries', icon: 'fa-inbox', label: 'Enquiries' },
  { key: 'visa-results', href: '/admin/visa-results', icon: 'fa-passport', label: 'Visa Results' },
  { key: 'coaching-results', href: '/admin/coaching-results', icon: 'fa-graduation-cap', label: 'Coaching Results' },
  { key: 'news', href: '/admin/news', icon: 'fa-newspaper', label: 'News / Updates' },
  { key: 'students', href: '/admin/students', icon: 'fa-user-graduate', label: 'Students Portal' },
  { key: 'countries', href: '/admin/countries', icon: 'fa-earth-asia', label: 'Study Abroad' },
  { key: 'reviews', href: '/admin/reviews', icon: 'fa-star', label: 'Reviews' },
  { key: 'settings', href: '/admin/settings', icon: 'fa-gear', label: 'Site Settings' },
  { key: 'staff', href: '/admin/staff', icon: 'fa-users', label: 'Staff Accounts', ownerOnly: true }
]

export function AdminLayout({ title, user, activeNav, children }: AdminLayoutProps) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Admin — 1st Choice IELTS &amp; Immigration</title>
  <meta name="robots" content="noindex,nofollow" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: { brand: { blue:'#0b2559', bluedark:'#061534', bluelight:'#13407d', red:'#f70009', reddark:'#c40007' } },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Poppins','system-ui','sans-serif'] } } }
    }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="/static/css/app.css" rel="stylesheet" />
  <link href="/static/css/admin.css" rel="stylesheet" />
</head>
<body class="bg-slate-50 font-sans text-slate-800">
  <div class="flex min-h-screen">
    <aside id="admin-sidebar" class="w-64 bg-brand-bluedark text-white flex-col shrink-0 fixed inset-y-0 left-0 z-30 -translate-x-full lg:translate-x-0 lg:flex transition-transform">
      <div class="p-5 flex items-center gap-3 border-b border-white/10">
        <img src="/static/images/logo.png" class="h-10 w-auto bg-white rounded p-0.5" alt="Logo" />
        <div>
          <p class="font-display font-bold text-sm leading-tight">1st Choice</p>
          <p class="text-[10px] text-slate-400">Admin Portal</p>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        ${NAV_ITEMS.filter((i) => !i.ownerOnly || user.role === 'owner')
          .map(
            (item) => `
          <a href="${item.href}" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
              activeNav === item.key ? 'bg-brand-red text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }">
            <i class="fa-solid ${item.icon} w-5 text-center"></i> ${item.label}
          </a>`
          )
          .join('')}
      </nav>
      <div class="p-4 border-t border-white/10">
        <a href="/" target="_blank" class="flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-3">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> View Live Site
        </a>
        <form method="post" action="/admin/logout">
          <button type="submit" class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-2.5 rounded-lg">
            <i class="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </form>
      </div>
    </aside>

    <div id="admin-backdrop" class="fixed inset-0 bg-black/40 z-20 hidden lg:hidden"></div>

    <div class="flex-1 lg:ml-64 flex flex-col min-w-0">
      <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div class="flex items-center justify-between px-5 py-4">
          <div class="flex items-center gap-3">
            <button id="admin-menu-toggle" class="lg:hidden w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600">
              <i class="fa-solid fa-bars text-lg"></i>
            </button>
            <h1 class="font-display font-bold text-lg sm:text-xl text-brand-blue">${title}</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right hidden sm:block">
              <p class="text-sm font-bold text-slate-700">${escapeHtml(user.name)}</p>
              <p class="text-xs text-slate-400 capitalize">${user.role}</p>
            </div>
            <div class="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold">
              ${escapeHtml(user.name.charAt(0).toUpperCase())}
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 p-5 sm:p-8">
        ${typeof children === 'string' ? children : ''}
      </main>
    </div>
  </div>

  <script src="/static/js/admin.js"></script>
</body>
</html>`
  return html
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
