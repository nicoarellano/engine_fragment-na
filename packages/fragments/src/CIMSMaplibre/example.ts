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
import * as FRAGS from '../FragmentsModels';
import maplibregl, {
  LngLatLike,
  CustomLayerInterface,
  SourceSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/* MD
  ### 🌎 Setting up a Simple Scene
  To get started, let's set up a basic ThreeJS scene. This will serve as the foundation for our application and allow us to visualize the 3D models effectively:
*/

interface Location {
  coords: LngLatLike;
  angle?: number;
  elevation?: number;
}

interface Bldg {
  id: string;
  name: string;
  location: Location;
}

const buildings: Bldg[] = [
  {
    id: 'AA',
    name: 'Architecture Building',
    location: {
      coords: { lng: -75.69765955209732, lat: 45.38389669263273 },
      angle: 0,
      elevation: -1,
    },
  },
  {
    id: 'BB',
    name: 'Bronson Substation',
    location: {
      coords: { lng: -75.69185223430395, lat: 45.38636213794322 },
      angle: 0,
      elevation: 3,
    },
  },
  // { id: 'CB', name: 'Canal Building' },
  // { id: 'NB', name: 'Nicol Building' },
  {
    id: 'PA',
    name: 'Paterson Hall',
    location: {
      coords: { lng: -75.69835199446455, lat: 45.38152527897171 },
      angle: 35,
      elevation: 5,
    },
  },
  // { id: 'VS', name: 'VISIM Building' },
];

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

world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
const mapCamera = new THREE.PerspectiveCamera();
world.camera.controls.setLookAt(183, 50, -102, 27, -52, -11); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
const grid = grids.create(world);
grid.visible = false;
const mapScene = world.scene.three.clone();
grid.visible = true;
world.scene.three.add(axesHelper);

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
  ### 📂 Loading Fragments Models
  With the core setup complete, it's time to load a Fragments model into our scene. Fragments are optimized for fast loading and rendering, making them ideal for large-scale 3D models.

  :::info Where can I find Fragment files?

  You can use the sample Fragment files available in our repository for testing. If you have an IFC model you'd like to convert to Fragments, check out the IfcImporter tutorial for detailed instructions.

  :::

  To make things more convenient, let's create a helper function that will load the Fragments Model from a given URL:
*/
let models: FRAGS.FragmentsModel[] = [];

const path = '../../../../resources/private/frags/';
const loadFragmentFile = async (id: string) => {
  world.camera.updateAspect();
  const url = `${path}${id}.frag`;
  const file = await fetch(url);
  const mapFile = await fetch(url);
  const buffer = await file.arrayBuffer();
  const mapBuffer = await mapFile.arrayBuffer();
  const model = await fragments.load(buffer, { modelId: id });
  const mapModel = await fragments.load(mapBuffer, { modelId: `${id}@map` });
  mapScene.add(mapModel.object);
  // world.scene.three.add(model.object);
  models.push(model);
  console.log(`Model ${id} loaded`, models);
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

const maplibre = new maplibregl.Map({
  container: 'map', // container id
  style: '../../../../resources/private/styles/satellite.json',
  center: buildings[0].location.coords,
  zoom: 15.5,
  pitch: 45,
  bearing: 0,
  canvasContextAttributes: { antialias: true },
  attributionControl: false,
  maplibreLogo: true,
  doubleClickZoom: false,
});

// const ifclocator = components.get(IFCLocator);

/* MD
Now we will add some UI to handle the logic of this tutorial. For more information about the UI library, you can check the specific documentation for it!
*/

let building = buildings.find((building) => building.id === 'AA');
if (!building || !building.location) {
  throw new Error("Building with id 'AA' not found or location is undefined.");
}
let { coords, angle, elevation } = building.location;

async function setMarker(coords: { lng: number; lat: number }) {
  const loadedLayer = maplibre.getLayer('places');

  if (loadedLayer) {
    maplibre.removeLayer('places');
    maplibre.removeSource('places');
    maplibre.removeImage('custom-marker');
  }

  // const image = await maplibre.loadImage(
  //   'https://maplibre.org/maplibre-gl-js/docs/assets/custom_marker.png'
  // );
  const image = await maplibre.loadImage(
    '../../../../resources/images/ifc-logo.png'
  );

  maplibre.addImage('custom-marker', image.data);

  const source: SourceSpecification = {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {
        description: "<strong>Click to modify Model's coordinates</strong>",
      },
      geometry: {
        type: 'Point',
        coordinates: coords as number[],
      },
    },
  };

  maplibre.addSource('places', source);

  const layer: CustomLayerInterface = {
    id: 'places',
    type: 'symbol',
    source: 'places',
    layout: {
      'icon-image': 'custom-marker',
      'icon-overlap': 'always',
      'icon-size': 0.2,
    },
  };

  console.log('Setting new marker: ', coords, layer, source);
  maplibre.addLayer(layer);
}

const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, any>(
  (_) => {
    const ids = getModelsIds();

    const onLoadModel = async ({ target }: { target: BUI.Button }) => {
      const id = target.getAttribute('data-name');
      if (!id) return;
      building = buildings.find((building) => building.id === id);
      if (building) {
        coords = building?.location.coords;
        setMarker(coords);
        loadModel(coords, elevation, angle);
        angle = building?.location.angle;
        const trueNorthInRadians = (angle ?? 0) * (Math.PI / 180);
        mapScene.rotateY(trueNorthInRadians);

        elevation = building?.location.elevation;
        mapScene.position.setY(elevation ?? 0);
      }

      target.loading = true;
      if (ids.includes(id)) {
        await disposeModels([id]);
      } else {
        await loadFragmentFile(id);
      }
      target.loading = false;
    };

    const onDisposeModels = () => {
      disposeModels();
      models = [];
    };

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

    function onAddToMap() {
      console.log('Add to map');
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
          <!-- <div style="display: flex; gap: 0.25rem">
                <bim-button data-name='MAP' label='Load in Map' icon='lucide:map-pinned' @click=${onAddToMap}></bim-button>
              </div> -->
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

let sceneOrigin = new maplibregl.LngLat(coords.lng, coords.lat);
let modelLocation = new maplibregl.LngLat(coords.lng, coords.lat);
// const threeCamera = world.camera.three as THREE.Camera;

const layerRenderer = new THREE.WebGLRenderer({
  canvas: maplibre.getCanvas(),
  context: maplibre.getCanvas().getContext('webgl') as WebGLRenderingContext,
  alpha: true,
});

let altitude = 0;
let dynamicAltitude = 0;

const heightSlider = document.getElementById(
  'height-slider'
) as HTMLInputElement;

const altitudeLabel = document.getElementById('height') as HTMLLabelElement;
heightSlider.addEventListener('input', () => {
  dynamicAltitude = parseFloat(heightSlider.value);
  altitudeLabel.textContent = dynamicAltitude.toString();
});

const popup = new maplibregl.Popup({
  closeButton: false,
  closeOnClick: false,
});

// const mapCamera = new THREE.PerspectiveCamera();
mapCamera.addEventListener('rest', () => fragments.update(true));
mapCamera.addEventListener('update', () => fragments.update());
// maplibre.on('mouseover', () => fragments.update());

let mapElevation = 0;
let modelElevation = 0;

fragments.models.list.onItemSet.add(async ({ value: model }) => {
  console.log('Model loaded: ', model);
  // if (model.modelId.endsWith('map')) await model.useCamera(mapCamera);
  // else await model.useCamera(world.camera.three);
  model.useCamera(world.camera.three);
  const geometry = model.object;
  world.scene.three.add(geometry);
  fragments.update(true);
});

async function loadModel(
  coords: LngLatLike,
  elevation: number,
  rotation: number
) {
  mapElevation = maplibre.queryTerrainElevation(coords) ?? 0;
  modelElevation = elevation + mapElevation;
  modelLocation = new maplibregl.LngLat(coords.lng, coords.lat);
  sceneOrigin = new maplibregl.LngLat(coords.lng, coords.lat);

  console.log('Model elevation: ', modelElevation);

  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    coords,
    modelElevation
  );

  if (maplibre.getLayer('3d-model')) {
    maplibre.removeLayer('3d-model');
  }

  maplibre.on('mouseover', () => fragments.update(true));

  const customLayer: CustomLayerInterface = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd() {
      layerRenderer.autoClear = false;
    },

    // RAYCASTING: https://jsfiddle.net/5vpL7ays/7/
    // RAYCASTING: https://stackoverflow.com/questions/59163141/raycast-in-three-js-with-only-a-projection-matrix/61642776#61642776

    render(_, matrix) {
      const angle = document.getElementById('angle-slider') as HTMLInputElement;
      const angleValue = angle.value;
      const angleNumber = parseFloat(angleValue);
      const angleInRadians = (angleNumber * Math.PI) / -180;

      const sceneOriginMercator = maplibregl.MercatorCoordinate.fromLngLat(
        sceneOrigin,
        modelElevation
      );

      const sceneTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: maplibregl.MercatorCoordinate.fromLngLat(coords, altitude)
          .z,
        scale: sceneOriginMercator.meterInMercatorCoordinateUnits(),
      };

      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        Math.PI / 2
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        angleInRadians
      );

      altitude =
        maplibre.queryTerrainElevation(modelLocation) !== null
          ? (maplibre.queryTerrainElevation(modelLocation) ?? 0) +
            dynamicAltitude
          : dynamicAltitude;

      altitudeLabel.textContent = altitude.toFixed(1).toString();

      const m = new THREE.Matrix4().fromArray(
        matrix.defaultProjectionData.mainMatrix
      );
      const dynamicTransform = {
        x: sceneTransform.translateX,
        y: sceneTransform.translateY,
        z: sceneTransform.translateZ,
      };

      const l = new THREE.Matrix4()
        .makeTranslation(
          dynamicTransform.x,
          dynamicTransform.y,
          dynamicTransform.z
        )
        .scale(
          new THREE.Vector3(
            sceneTransform.scale,
            -sceneTransform.scale,
            sceneTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY);

      mapCamera.projectionMatrix = m.multiply(l);
      layerRenderer.resetState();

      layerRenderer.render(mapScene, mapCamera);
      maplibre.triggerRepaint();
    },
  };

  let styleLoaded = false;

  maplibre.on('style.load', () => {
    maplibre.addLayer(customLayer);
    if (styleLoaded) return;
    styleLoaded = true;
  });

  let bbox: THREE.Box3;

  fragments.onModelLoaded.add(async (model) => {
    if (model.box) {
      bbox = model.box;
      await world.camera.controls.fitToBox(bbox, false);
    }
  });

  const isLoaded = maplibre.isStyleLoaded();
  if (isLoaded) maplibre.addLayer(customLayer);

  maplibre.on('load', async () => {
    if (!maplibre.getLayer('custom-marker'))
      setMarker([coords.lng, coords.lat]);

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
        loadModel(e.lngLat, elevation, angle);
        setMarker([e.lngLat.lng, e.lngLat.lat] as number[]);
        popup.remove();

        maplibre.getCanvas().style.cursor = '';

        holdPopup = false;
      }
    });
  });

  maplibre.setZoom(16);
  maplibre.flyTo({
    center: [coords.lng, coords.lat],
    zoom: 18.5,
    speed: 1, // Adjust the speed of the flyTo animation
    curve: 1.42, // Adjust the curve of the flyTo animation
    easing: (t) => t, // Linear easing
  });
}
