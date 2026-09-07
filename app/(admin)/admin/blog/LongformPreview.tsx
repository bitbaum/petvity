"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArticleBody } from "bip-kit/react";
import type { ContentBlock } from "bip-kit";

/**
 * Live preview for the admin editor: the SAME reference renderer as the
 * public post page, so what the author sees is what readers get (restyled
 * to the light admin theme by the .pv-preview scope in app/longform.css).
 *
 * ArticleBody is an async server component by design (it pre-awaits
 * optional peers); with none registered it resolves immediately, so on the
 * client we call it as a function and render the resolved tree.
 */
export default function LongformPreview({ blocks }: { blocks: ContentBlock[] }) {
  const [tree, setTree] = useState<ReactNode>(null);

  useEffect(() => {
    let live = true;
    void Promise.resolve(ArticleBody({ blocks, lightbox: false })).then((node) => {
      if (live) setTree(node);
    });
    return () => {
      live = false;
    };
  }, [blocks]);

  return <div className="pv-preview">{tree}</div>;
}
