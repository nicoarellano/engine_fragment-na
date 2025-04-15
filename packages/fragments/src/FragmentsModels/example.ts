/* MD
  ## Loading Fragment Models 🔼
  ---
  Before diving into the world of Fragments, the first step is to load your Fragment Models. This is a crucial step to unlock the full potential of working with Fragments. Let's explore how to do it effectively.
  
  ### 🖖 Importing our Libraries
  First things first, let's install all necessary dependencies to make this example work:
*/

import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as BUI from '@thatopen/ui';
import Stats from 'stats.js';
// You have to import * as FRAGS from "@thatopen/fragments"
import * as FRAGS from '..';
import maplibregl, { LngLatLike, CustomLayerInterface } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

interface Bldg {
  id: string;
  name: string;
}

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

const axesHelper = new THREE.AxesHelper(1000);

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById('container')!;

// Create a red box and add it to the scene
const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const redBox = new THREE.Mesh(geometry, material);

world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(183, 11, -102, 27, -52, -11); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
grids.create(world);
world.scene.three.add(redBox);
world.scene.three.add(axesHelper);

/* MD
  :::info Do I need @thatopen/components?

  Not necessarily! While @thatopen/components simplifies the process of setting up a scene, you can always use plain ThreeJS to create your own custom scene setup. It's entirely up to your preference and project requirements! 😉

  :::

  ### 🛠️ Setting Up Fragments
  Now, let's configure the Fragments library core. This will allow us to load models effortlessly and start manipulating them with ease:
*/

const groups = new THREE.Group();

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

// Once a model is available in the list, we can tell what camera to use
// in order to perform the culling and LOD operations.
// Also, we add the model to the 3D scene.
fragments.models.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  // At the end, you tell fragments to update so the model can be seen given
  // the initial camera position
  fragments.update(true);
});

/* MD
  ### 📂 Loading Fragments Models
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::

  To make things more convenient, let's create a helper function that will load the Fragments Model from a given URL:
*/

const loadFragmentFile = async (url: string, id: string) => {
  const file = await fetch(url);
  const buffer = await file.arrayBuffer();
  await fragments.load(buffer, { modelId: id });
};

/* MD
  At any point, you can retrieve the binary data of a loaded model for exporting. This is particularly useful when models are loaded automatically from a remote source, but you want to provide an option to download the data locally for further use:
*/

const getBinaryData = async (id: string) => {
  const model = fragments.models.list.get(id);
  if (!model) return null;
  const buffer = await model.getBuffer(false);
  return { name: model.modelId, buffer };
};

/* MD
  Now that all Fragments Models are loaded with unique IDs, let's create a helper function to retrieve these IDs. This will make it easier to manage models, such as loading, disposing, or performing other operations on them.
*/

const getModelsIds = () => {
  const models = fragments.models.list.values();
  const ids = [...models].map((model) => model.modelId);
  return ids;
};

/* MD
  ### 🛡️ Prevent Memory Leaks
  Proper memory management is crucial to ensure your application remains performant and stable. While Fragments Models are optimized for efficiency, it's important to dispose of unused models to prevent memory leaks. Here's a utility function to help you manage this effectively:
*/

const disposeModels = async (ids = getModelsIds()) => {
  const promises = [];
  for (const id of ids) promises.push(fragments.disposeModel(id));
  await Promise.all(promises);
};

/* MD
  ### 🧩 Adding User Interface (optional)
  We will use the `@thatopen/ui` library to add some simple and cool UI elements to our app. First, we need to call the `init` method of the `BUI.Manager` class to initialize the library:
*/

BUI.Manager.init();

// const ifclocator = components.get(IFCLocator);

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const ids = getModelsIds();

    const onLoadModel = async ({ target }: { target: BUI.Button }) => {
      const name = target.getAttribute('data-name');
      if (!name) return;
      const id = name;
      target.loading = true;
      if (ids.includes(id)) {
        await disposeModels([id]);
      } else {
        await loadFragmentFile(`../../../../resources/frags/${id}.frag`, id);
      }
      target.loading = false;
    };

    const onDisposeModels = () => disposeModels();

    const onDownloadModel = async ({ target }: { target: BUI.Button }) => {
      const name = target.getAttribute('data-name');
      if (!name) return;
      const id = name;
      target.loading = true;
      const result = await getBinaryData(id);
      if (result) {
        const { name, buffer } = result;
        const a = document.createElement('a');
        const file = new File([buffer], `${name}.frag`);
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      target.loading = false;
    };

    const buildings: Bldg[] = [
      { id: 'school_arq', name: 'Architecture' },
      { id: 'school_mep', name: 'MEP' },
      { id: 'school_str', name: 'Structural' },
    ];

    function onMapRefresh() {
      console.log('Refreshing map...'); // Placeholder for map refresh logic
    }

    return BUI.html`
      <bim-panel id="controls-panel" active label="Fragments Models" class="options-menu">
        <bim-panel-section label="Controls">
          ${buildings.map(({ id, name }) => {
            const isLoaded = ids.some((modelId) => modelId.includes(id));
            const label = isLoaded ? `Remove ${name}` : `Load ${name}`;
            return BUI.html`
              <div style="display: flex; gap: 0.25rem">
                <bim-button data-name=${id} label=${label} @click=${onLoadModel}></bim-button>
                ${
                  isLoaded
                    ? BUI.html`<bim-button data-name=${id} label="Download" @click=${onDownloadModel}></bim-button>`
                    : null
                }
              </div>
            `;
          })}
          <div style="display: flex; gap: 0.25rem">
                <bim-button data-name='MAP' label='Load in Map' icon='lucide:map-pinned' @click=${onMapRefresh}></bim-button>
              </div>
          <bim-button ?disabled=${ids.length === 0} label="Remove All" @click=${onDisposeModels}></bim-button>
        </bim-panel-section>
      </bim-panel>
    `;
  },
  {}
);

fragments.models.list.onItemSet.add(() => updatePanel());
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

const latitude = 45.38476465194293;
const longitude = -75.69496396358156;

const coords: LngLatLike = [longitude, latitude];
const altitude = 10;
const rotation = [Math.PI / 2, 0.75, 0];

const loadModel = async (coords: LngLatLike) => {
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    coords,
    altitude
  );

  const maplibre = new maplibregl.Map({
    container: 'map', // container id
    style:
      'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    center: coords,
    zoom: 16,
    pitch: 45,
    bearing: -17.6,
    doubleClickZoom: false,
  });

  if (maplibre.getLayer('3dmodel')) {
    maplibre.removeLayer('3dmodel');
  }

  const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: rotation[0],
    rotateY: rotation[1],
    rotateZ: rotation[2],
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 100,
  };

  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  const layerCamera = new THREE.Camera();
  const layerRenderer = new THREE.WebGLRenderer({
    canvas: maplibre.getCanvas(),
    context: maplibre.getCanvas().getContext('webgl') as WebGLRenderingContext,
    antialias: true,
    alpha: true,
  });

  const customLayer: CustomLayerInterface = {
    id: '3dmodel',
    type: 'custom',
    renderingMode: '3d',
    async onAdd() {
      world.scene.three.add(axesHelper);
      world.scene.three.add(redBox);
      layerRenderer.autoClear = false;
    },
    render(_, matrix) {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );

      const projectionMatrix = new THREE.Matrix4().fromArray(
        matrix.defaultProjectionData.mainMatrix
      );
      const transformationMatrix = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      layerCamera.projectionMatrix =
        projectionMatrix.multiply(transformationMatrix);

      layerRenderer.resetState();
      // console.log(world.scene.three.children, layerCamera);
      layerRenderer.render(world.scene.three, layerCamera);

      maplibre.triggerRepaint();
    },
  };

  async function setMarker(center: number[]) {
    const loadedLayer = maplibre.getLayer('places');

    if (loadedLayer) {
      maplibre.removeLayer('places');
      maplibre.removeSource('places');
      maplibre.removeImage('custom-marker');
    }

    const image = await maplibre.loadImage(
      'https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png'
    );

    maplibre.addImage('custom-marker', image.data);

    maplibre.addSource('places', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {
          description: "<strong>Click to modify Model's coordinates</strong>",
        },
        geometry: {
          type: 'Point',
          coordinates: center as number[],
        },
      },
    });

    maplibre.addLayer({
      id: 'places',
      type: 'symbol',
      source: 'places',
      layout: {
        'icon-image': 'custom-marker',
        'icon-overlap': 'always',
      },
    });
  }

  maplibre.on('style.load', () => {
    maplibre.addLayer(customLayer);
  });

  maplibre.on('load', async () => {
    setMarker(coords as number[]);

    let holdPopup = false;

    maplibre.on('mouseenter', 'places', (e) => {
      maplibre.getCanvas().style.cursor = 'pointer';
      if (!(e.features && 'properties' in e.features[0])) return;
      const properties = e.features[0].properties as { description: string };
      const description = properties.description;

      if (!holdPopup) {
        popup
          .setLngLat(e.lngLat)
          .setHTML(description as string)
          .addTo(maplibre);
      }
    });
    maplibre.on('click', 'places', (e) => {
      maplibre.getCanvas().style.cursor = 'crosshair';
      const description =
        '<strong>Double click on the map to set new coordinates</strong>';
      popup.setLngLat(e.lngLat).setHTML(description).addTo(maplibre);

      holdPopup = true;

      maplibre.doubleClickZoom.disable();
    });

    maplibre.on('mouseleave', 'places', () => {
      if (!holdPopup) {
        maplibre.getCanvas().style.cursor = '';
        popup.remove();
      }
    });

    maplibre.on('dblclick', (e) => {
      if (holdPopup) {
        loadModel(e.lngLat);
        console.log(e);
        setMarker([e.lngLat.lng, e.lngLat.lat]);
        popup.remove();

        console.log(e.lngLat);

        maplibre.getCanvas().style.cursor = '';
        maplibre.setCenter(e.lngLat);
        maplibre.setZoom(18);
        maplibre.setPitch(45);
        maplibre.setBearing(-17.5);

        holdPopup = false;

        setTimeout(() => {
          maplibre.doubleClickZoom.enable();
        }, 100);
      }
    });
  });
};

loadModel(coords);
