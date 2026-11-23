import type { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

// Email action codes are URL credentials; do not send them in asset/link
// referrers, including before the shared app finishes loading its fonts.
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="referrer" content="no-referrer" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
