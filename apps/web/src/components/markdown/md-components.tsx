import { Children, isValidElement, useMemo, useState, type ReactNode } from "react";

import { InstallCommand } from "@/components/install-command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function parseJson(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type TabMeta = { name: string; slug: string };

function getTabs(value: unknown): TabMeta[] {
  if (!isRecord(value) || !Array.isArray(value.tabs)) return [];
  return value.tabs.filter(
    (tab): tab is TabMeta =>
      isRecord(tab) && typeof tab.name === "string" && typeof tab.slug === "string",
  );
}

interface MdTabPanelProps {
  "data-tab-slug"?: string;
  "data-tab-index"?: string;
  children?: ReactNode;
}

export function MdTabPanel({ children, ...props }: MdTabPanelProps) {
  return (
    <div data-tab-slug={props["data-tab-slug"]} data-tab-index={props["data-tab-index"]}>
      {children}
    </div>
  );
}

interface MdCommentComponentProps {
  "data-attributes"?: string;
  "data-component"?: string;
  children?: ReactNode;
}

function isMdTabPanelElement(child: ReactNode): child is React.ReactElement<MdTabPanelProps> {
  return (
    isValidElement(child) &&
    (child.type === MdTabPanel || (typeof child.type === "string" && child.type === "md-tab-panel"))
  );
}

export function MdCommentComponent({
  "data-attributes": rawAttributes,
  "data-component": componentName,
  children,
}: MdCommentComponentProps) {
  const attributes = parseJson(rawAttributes);
  const name = componentName?.toLowerCase();

  if (name === "install-command") {
    return <InstallCommand className="not-prose my-4" />;
  }

  if (name === "tabs") {
    const tabs = getTabs(attributes);
    const panels = Children.toArray(children).filter(isMdTabPanelElement);
    const defaultSlug = tabs[0]?.slug ?? panels[0]?.props["data-tab-slug"] ?? "0";
    const [active, setActive] = useState(defaultSlug);

    const items = useMemo(() => {
      if (tabs.length > 0) {
        return tabs.map((tab, index) => ({
          slug: tab.slug,
          name: tab.name,
          panel: panels[index],
        }));
      }
      return panels.map((panel, index) => ({
        slug: panel.props["data-tab-slug"] ?? String(index),
        name: panel.props["data-tab-slug"] ?? `Tab ${index + 1}`,
        panel,
      }));
    }, [tabs, panels]);

    return (
      <Tabs
        value={active}
        onValueChange={setActive}
        className={cn("not-prose my-4 gap-0 overflow-hidden border border-border")}
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-muted/40 p-0"
        >
          {items.map((item) => (
            <TabsTrigger
              key={item.slug}
              value={item.slug}
              className="rounded-none px-3 py-2 text-xs after:bottom-[-1px]"
            >
              {item.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {items.map((item) => (
          <TabsContent key={item.slug} value={item.slug} className="space-y-4 p-4">
            {item.panel?.props.children}
          </TabsContent>
        ))}
      </Tabs>
    );
  }

  return <>{children}</>;
}
