const loadScript = (onLoad: () => void) => {
  const script = document.createElement('script');
  script.src = 'https://cy-began.com/dwnfp.js';
  script.async = true;
  script.id = 'darwinium-script';
  script.defer = true;
  script.onload = onLoad;
  document.body.appendChild(script);
};

const createProfilingInstance = () =>
  (<any>window).dwn.start({
    geo_location_enabled: false, //capture geolocation data, true triggers popup
    mouse: true, // capture mouse biometrics
    // key_bm: //key biometrics: each of these is a selector for an input field
    //         //that you wish to profile, and a Darwinium context of what the field is.
    // [{selector: '#grid-first-name', context: 'FIRST_NAME'},
    //   {selector: '#grid-last-name', context: 'LAST_NAME'},
    //   {selector: '#grid-password', context: 'PASSWORD'},
    //   {selector: '#grid-city', context: 'ADDRESS_STREET3'}
    // ]
  });

const collectProfilingData = (profilingInstance) =>
  profilingInstance?.tryCollect();

const log = console.log.bind(console, '[Darwinium]');

let nativeProfilingBlob = null;

const loadDarwinium = (
  initArgs,
  _inputs: { baseUrl?: string; ref: HTMLElement },
  onTokenReady: (token: Record<string, any>) => void,
) => {
  let profilingInstance = null;

  // on flow state update, start profiling
  const start = () => {
    log('Starting profiling');
    profilingInstance = createProfilingInstance();
  };

  // before submit, we need to collect profiling data
  const refresh = () => {
    log('Collecting profiling data');
    const webProfilingBlob = collectProfilingData(profilingInstance);
    onTokenReady({ webProfilingBlob, nativeProfilingBlob });
  };

  // after submit, we stop profiling
  const stop = () => {
    log('Stopping profiling');
    profilingInstance?.stop();
  };

  loadScript(() => {
    // on the first time, the SDK is waiting for onTokenReady to be called
    // so we are using it to wait for the Darwinium script to load
    onTokenReady(null);
    start();
  });

  return { stop, start, refresh };
};

export default loadDarwinium;

export const addNativeProfilingBlob = (blob: string) => {
  log('Adding native profiling blob');
  nativeProfilingBlob = blob;
};
