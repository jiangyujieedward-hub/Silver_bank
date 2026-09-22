import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
await build({configFile:false,plugins:[react()],resolve:{alias:{'@':process.cwd()}},build:{ssr:'tests/interface.tsx',outDir:'mobile-build/interface-test',emptyOutDir:true}});
await import(resolve('mobile-build/interface-test/interface.js'));
