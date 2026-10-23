import Link from "next/link";
import { COIN_SYMBOL, EXPLORER_TITLE } from "@/lib/config";
import { CubeIcon } from "./Icons";
import { NavLiveBadge } from "./NavLiveBadge";
import { NavSearch } from "./NavSearch";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-6 md:flex-nowrap">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-fg">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
            <CubeIcon className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{EXPLORER_TITLE}</span>
          <span className="sm:hidden">{COIN_SYMBOL}</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-[13px] text-muted">
          <Link href="/" className="rounded px-2 py-1 hover:bg-surface hover:text-fg">
            Dashboard
          </Link>
          <Link href="/blocks" className="rounded px-2 py-1 hover:bg-surface hover:text-fg">
            Blocks
          </Link>
        </nav>
        <div className="ml-auto md:hidden">
          <NavLiveBadge />
        </div>
        <div className="order-last w-full md:order-none md:ml-auto md:w-auto md:min-w-[22rem] md:max-w-xl md:flex-1">
          <NavSearch />
        </div>
        <div className="hidden md:block">
          <NavLiveBadge />
        </div>
      </div>
    </header>
  );
}
