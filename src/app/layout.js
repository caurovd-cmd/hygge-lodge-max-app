export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Hygge Lodge — Глэмпинг</title>
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}