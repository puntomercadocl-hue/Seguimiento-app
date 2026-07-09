# Sitio web — Talita Cumi 🪔

Sitio de presentación para la marca **Talita Cumi** (@talitacumivzla), basado en el
brief de la marca: paleta crema / rosa empolvado / marrón, mensaje central
*"Niña, levántate" (Marcos 5:41)*, valores y catálogo de productos.

Es **un solo archivo** (`index.html`) sin dependencias ni build: todo el CSS y JS
está incluido dentro. Se puede abrir directo en el navegador haciendo doble clic.

## Cómo publicarlo (gratis)

Cualquiera de estas opciones sirve:

- **Netlify Drop** — entra a https://app.netlify.com/drop y arrastra la carpeta
  `talita-cumi`. Listo, te da un link público al instante.
- **Vercel** — crea un proyecto nuevo apuntando a este repositorio y en
  "Root Directory" pon `talita-cumi`. Framework: *Other* (sin build).
- **GitHub Pages** — en Settings → Pages del repositorio, activa Pages y apunta a
  la carpeta que contenga este archivo.

## Cómo personalizarlo

- **Colores**: están todos al inicio del archivo, en el bloque `:root`
  (`--crema`, `--rosa`, `--marron`, etc.). Cambiando esos valores cambia todo el sitio.
- **Textos**: todo el contenido está en español dentro del HTML, sección por sección
  (`#historia`, `#valores`, `#productos`, `#contacto`).
- **Fotos de productos**: por ahora cada producto tiene una ilustración. Para usar
  fotos reales (las del Drive / Instagram), reemplaza el contenido de cada
  `<div class="prod-visual">…</div>` por `<img src="ruta-de-la-foto.jpg" alt="...">`.
- **Enlaces**: todos los botones apuntan a https://www.instagram.com/talitacumivzla.

## Modo claro y oscuro

El sitio se adapta automáticamente al tema del dispositivo (claro u oscuro),
manteniendo la paleta de la marca en ambos.
