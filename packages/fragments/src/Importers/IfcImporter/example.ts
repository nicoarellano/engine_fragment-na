/* MD
  ## Converting IFC to Fragments 😀
  ---
  In this tutorial, we'll learn how to convert large and complex IFC files into the lightweight, modern binary BIM data that we call Fragments for high-performance applications. Let's get started!
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import Stats from 'stats.js';
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from '../..';

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById('container')!;
world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(74, 16, 0.2, 30, -4, 27); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### Converting IFCs 🚀
  The IfcImporter is your gateway to converting IFC files into Fragments, enabling you to build high-performance BIM applications effortlessly. With just a few lines of code, you can transform complex IFC data into lightweight, modern Fragments. Let's dive in and make it happen!
  */

const serializer = new FRAGS.IfcImporter();
serializer.wasm = { absolute: true, path: 'https://unpkg.com/web-ifc@0.0.68/' };
// A convenient variable to hold the ArrayBuffer data loaded into memory
let fragmentBytes: ArrayBuffer | null = null;
let onConversionFinish = () => {};

// const fileName = 'CANAL IFC4 - full_phase 1';
// const fileName = 'PATERSON HALL';
// const fileName = 'BLDG-22 IFC4';
// const fileName = 'CDC-CIMS-FEDERATED_BLDGS-SUST-CIMS-DOC-BLDG_22-AS_FOUND-IFC4';
const fileName = 'bro';

let ifcFileSize: number;
let fragmentFileSize: number;
let startDate: string;
let finishDate: string;
let conversionTime: number;
let reportLabel: string;

const convertIFC = async () => {
  const url = `../../../../../resources/ifc/${fileName}.ifc`;
  startDate = new Date().toLocaleString();
  // console.log(`🔃 Loading ${fileName}.ifc at ⏳ ${startDate} `);
  const startTime = performance.now();
  const ifcFile = await fetch(url);
  const fileSizeInBytes = parseInt(
    ifcFile.headers.get('content-length') || '0',
    10
  );
  ifcFileSize = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
  // console.log(`📦 IFC File size: ${ifcFileSize} MB`);
  const ifcBuffer = await ifcFile.arrayBuffer();
  const ifcBytes = new Uint8Array(ifcBuffer);
  fragmentBytes = await serializer.process({ bytes: ifcBytes });
  finishDate = new Date().toLocaleString();
  // console.log(`🏁 Conversion finished for ${fileName}.ifc at ⌛ ${finishDate}`);
  const finishTime = performance.now();
  conversionTime = ((finishTime - startTime) / 1000).toFixed(2);
  // console.log(`⏱️ Conversion time: ${conversionTime} seconds`);
  loadModel();
  onConversionFinish();
};

/* MD
  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load the converted files effortlessly and start manipulating them with ease:
  */

// You can copy `/node_modules/@thatopen/fragments/dist/Worker/worker.mjs` to your project directory
// and provide the relative path of the worker, or fetch it from github, unpkg, etc.
const workerUrl =
  'https://thatopen.github.io/engine_fragment/resources/worker.mjs';
const fetchedWorker = await fetch(workerUrl);
const workerText = await fetchedWorker.text();
const workerFile = new File([new Blob([workerText])], 'worker.mjs', {
  type: 'text/javascript',
});
const url = URL.createObjectURL(workerFile);
const fragments = new FRAGS.FragmentsModels(url);
world.camera.controls.addEventListener('rest', () => fragments.update(true));
world.camera.controls.addEventListener('update', () => fragments.update());

/* MD
  ### Loading a Fragments Model 🚧
  With the core already set up, let's create a simple function to load the Fragments Model from the binary data and add it to the scene. This function ensures seamless integration of the converted model into our application:
*/

async function createReport() {
  reportLabel = `---------------------------------
  ${fileName} has been converted to Fragments binary data and added to the scene!
  ---------------------------------
  📦 IFC file size: ${ifcFileSize} MB
  📏 Fragment file size: ${fragmentFileSize} MB
  --------------------------------
  ⏳ Loaded at: ${startDate}
  ⏳ Finished conversion at: ${finishDate}
  ⏱️ Conversion time: ${conversionTime} seconds
  `;
  console.log(reportLabel);
  return reportLabel;
}

const loadModel = async () => {
  if (!fragmentBytes) return;
  const model = await fragments.load(fragmentBytes, { modelId: fileName });
  fragmentFileSize = (fragmentBytes.byteLength / (1024 * 1024)).toFixed(2);
  console.log(`📏 Fragment file size: ${fragmentFileSize} MB`);
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  createReport();
  await fragments.update(true);
  onDownload();
};

/* MD
  To ensure optimal performance and prevent memory leaks, it's important to handle model disposal properly. Here's how we can do it:
*/

const removeModel = async () => {
  await fragments.disposeModel(fileName);
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

function onDownload() {
  if (!fragmentBytes) return;
  const file = new File([fragmentBytes], `${fileName}.frag`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    let content = BUI.html`
      <bim-label style="white-space: normal;">💡 Open the console to see more information</bim-label>
      <bim-button label="Load IFC" @click=${convertIFC}></bim-button>
    `;
    if (fragmentBytes) {
      content = BUI.html`
        <bim-label style="white-space: normal;">
        ${fileName} has been converted to Fragments binary data and added to the scene!
        </bim-label>
        <bim-button label="Add Model" @click=${loadModel}></bim-button>
        <bim-button label="Remove Model" @click=${removeModel}></bim-button>
        <bim-button label="Download Fragments" @click=${onDownload}></bim-button>
      `;
    }

    return BUI.html`
    <bim-panel id="controls-panel" active label="IFC Importer" class="options-menu">
      <bim-panel-section label="Controls">
        ${content}
      </bim-panel-section>
    </bim-panel>
  `;
  },
  {}
);

onConversionFinish = () => updatePanel();
fragments.models.list.onItemDeleted.add(() => updatePanel());

document.body.append(panel);

/* MD
  And we will make some logic that adds a button to the screen when the user is visiting our app from their phone, allowing to show or hide the menu. Otherwise, the menu would make the app unusable.
*/

const button = BUI.Component.create<BUI.PanelSection>(() => {
  const onClick = () => {
    if (panel.classList.contains('options-menu-visible')) {
      panel.classList.remove('options-menu-visible');
    } else {
      panel.classList.add('options-menu-visible');
    }
  };

  return BUI.html`
    <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
      @click=${onClick}>
    </bim-button>
  `;
});

document.body.append(button);

/* MD
  ### ⏱️ Measuring the performance (optional)
  We'll use the [Stats.js](https://github.com/mrdoob/stats.js) to measure the performance of our app. We will add it to the top left corner of the viewport. This way, we'll make sure that the memory consumption and the FPS of our app are under control.
*/

const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = '0px';
stats.dom.style.zIndex = 'unset';
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());

/* MD
  ### 🎉 Congratulations!
  You've successfully completed this tutorial on converting complex IFC models into lightweight and efficient Fragments Models! 🚀
  Now you can leverage this knowledge to build high-performance BIM applications with ease. Happy coding! 🎊
*/
