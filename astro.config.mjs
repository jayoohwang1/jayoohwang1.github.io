import { defineConfig } from 'astro/config';

// GitHub Pages:
// - User/org site at https://<user>.github.io  -> keep `base` unset.
// - Project site at https://<user>.github.io/<repo>  -> uncomment `base`
//   and set it to '/<repo>/'.
export default defineConfig({
  site: 'https://jayoohwang1.github.io',
  // base: '/personal_site/',
});
