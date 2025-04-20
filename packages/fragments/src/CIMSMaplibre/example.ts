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
const scale = 10;
const geometry = new THREE.BoxGeometry(scale, scale, scale);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const redBox = new THREE.Mesh(geometry, material);
redBox.position.setY(scale / 2);

world.renderer = new OBC.SimpleRenderer(components, container);

world.camera = new OBC.SimpleCamera(components);
world.camera.controls.setLookAt(183, 11, -102, 27, -52, -11); // convenient position for the model we will load

components.init();

const grids = components.get(OBC.Grids);
const grid = grids.create(world);
grid.visible = false;
const threeScene = world.scene.three.clone();
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

fragments.models.list.onItemSet.add(async ({ value: model }) => {
  await model.useCamera(world.camera.three);
  const geometry = model.object;
  // geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...]), 3)); // CHAT GPT SUGGESTED ADDING A POSITION ATTRIBUTE, DID NOT WORK
  world.scene.three.add(geometry);
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
const models: FRAGS.FragmentsModel[] = [];

const loadFragmentFile = async (url: string, id: string) => {
  const file = await fetch(url);
  const buffer = await file.arrayBuffer();
  const model = await fragments.load(buffer, { modelId: id });
  world.scene.three.add(model.object);
  threeScene.add(model.object);
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
        await loadFragmentFile(
          `../../../../resources/private/frags/${id}.frag`,
          id
        );
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
      { id: 'AA', name: 'Architecture Building' },
      { id: 'BB', name: 'Bronson Substation' },
      // { id: 'CB', name: 'Canal Building' },
      // { id: 'NB', name: 'Nicol Building' },
      { id: 'PA', name: 'Paterson Hall' },
      // { id: 'VS', name: 'VISIM Building' },
    ];

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

const carletonBB = {
  lng: -75.69185223430395,
  lat: 45.38636213794322,
};

const carletonPA = {
  lng: -75.69835199446455,
  lat: 45.38152527897171,
  angle: 35,
  elevation: 5,
};

const location = carletonPA;

const { lng, lat } = location;

const coords: LngLatLike = [lng, lat];

const maplibre = new maplibregl.Map({
  container: 'map', // container id
  style: '../../../../resources/private/styles/satellite.json',
  center: location as LngLatLike,
  zoom: 16,
  pitch: 45,
  bearing: 0,
  canvasContextAttributes: { antialias: true },
  attributionControl: false,
  maplibreLogo: true,
  doubleClickZoom: false,
});

const sceneOrigin = new maplibregl.LngLat(lng, lat);
const modelLocation = new maplibregl.LngLat(lng, lat);
// const threeCamera = world.camera.three as THREE.Camera;
const trueNorhtInRadians = (location.angle ?? 0) * (Math.PI / 180);
threeScene.rotateY(trueNorhtInRadians);
threeScene.position.setY(location.elevation ?? 0);

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

const loadModel = async (coords: LngLatLike) => {
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    coords,
    altitude
  );

  if (maplibre.getLayer('3d-model')) {
    maplibre.removeLayer('3d-model');
  }

  const layerCamera = new THREE.Camera();

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

      const offsetFromCenterElevation =
        maplibre.queryTerrainElevation(sceneOrigin) || 0;
      const sceneOriginMercator = maplibregl.MercatorCoordinate.fromLngLat(
        sceneOrigin,
        offsetFromCenterElevation
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

      layerCamera.projectionMatrix = m.multiply(l);
      layerRenderer.resetState();
      layerRenderer.render(threeScene, layerCamera);
      maplibre.triggerRepaint();
    },
  };

  async function setMarker(coords: number[]) {
    if (!Array.isArray(coords) || coords.some(isNaN)) return;
    console.log('COORS: ', coords);

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

  let styleLoaded = false;

  maplibre.on('style.load', () => {
    maplibre.addLayer(customLayer);
    if (styleLoaded) return;

    altitude = maplibre.queryTerrainElevation(sceneOrigin);
    console.log('Altitude: ', altitude);

    styleLoaded = true;
  });

  const isLoaded = maplibre.isStyleLoaded();
  if (isLoaded) maplibre.addLayer(customLayer);

  maplibre.on('load', async () => {
    if (!maplibre.getLayer('custom-marker')) setMarker(coords as number[]);

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
        setMarker([e.lngLat.lng, e.lngLat.lat] as number[]);
        popup.remove();

        maplibre.getCanvas().style.cursor = '';

        holdPopup = false;
      }
    });
  });
};

loadModel(coords as LngLatLike);
