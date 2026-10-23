"use client";
import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";

/** The home page has its own large hero search, so the nav copy is hidden there. */
export function NavSearch() {
  return usePathname() === "/" ? null : <SearchBar />;
}
