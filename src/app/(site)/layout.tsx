import { SiteFooter, SiteHeader } from "@/components/site/SiteChrome";

/**
 * The public website. Always light (navy on shell) whatever the visitor's colour scheme, because
 * the brand is read on that ground; the tools and portal keep their own layouts.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-shell text-navy">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
