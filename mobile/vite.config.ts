import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('mobile'),plugins:[react()],resolve:{alias:{'@':path.resolve('.')}},build:{outDir:path.resolve('mobile-www'),emptyOutDir:true},publicDir:path.resolve('public')});
