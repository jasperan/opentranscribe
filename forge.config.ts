import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDeb } from '@electron-forge/maker-deb';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'OpenTranscribe',
    executableName: 'opentranscribe',
    icon: './assets/icon',
    asar: true,
    extraResource: ['./backend'],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: 'OpenTranscribe',
      setupIcon: './assets/icon.ico',
    }),
    new MakerDeb({
      options: {
        name: 'opentranscribe',
        productName: 'OpenTranscribe',
        genericName: 'Speech to Text',
        description: 'Multi-model speech-to-text transcription tool',
        categories: ['AudioVideo', 'Audio', 'Utility'],
        icon: './assets/icon.png',
      },
    }),
    // MakerRpm removed - requires rpmbuild on system
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be
      // Main process, Preload scripts, Worker process, etc.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry`
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'jasperan',
          name: 'opentranscribe',
        },
        prerelease: false,
        draft: true,
      },
    },
  ],
};

export default config;
