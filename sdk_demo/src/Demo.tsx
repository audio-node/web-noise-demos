import { useEffect, useMemo, useRef, useState } from "react";
//@ts-ignore
import { createPatchNode } from "@web-noise/sdk/build";


const useControlNode = (audioContext: AudioContext) => {
  const [value, setValue] = useState(0);
  const node = useMemo(() => {
    const constantSource = audioContext.createConstantSource();
    constantSource.offset.value = 0;
    constantSource.start();
    return constantSource;
  }, [audioContext])

  useEffect(() => {
    node.offset.value = value;
  }, [node, value])

  return {
    node,
    setValue,
    value
  }
}

/*
 * config
 * */

const EFFECTS = {
  destroyer:
    "https://raw.githubusercontent.com/audio-node/web-noise-demos/main/prototypes/remixer/destroyer_with_balancer.json",
  radio:
    "https://raw.githubusercontent.com/audio-node/web-noise-demos/main/prototypes/remixer/radio_effect.json",
};

const loadEffect = async (name: string, audioContext: AudioContext) => {
  //@ts-ignore
  const destroyerPatchData = await fetch(EFFECTS[name]).then<{
    nodes: Array<any>;
    edges: Array<any>;
  }>((r) => r.json());

  const patchNode = await createPatchNode({
    data: destroyerPatchData,
    audioContext,
  });

  return patchNode;
};

const Demo = () => {

  const mediaElement = useRef<HTMLAudioElement>(null)
  const audioContext = useMemo(() => {
    const ctx = new AudioContext();
    ctx.resume();
    return ctx;
  }, []);

  // destroyer control
  const { node: destroyerDryWet, setValue: setDestroyerValue, value: destroyerValue } = useControlNode(audioContext)

  // radio control
  const { node: radioDryWet, setValue: setRadioValue, value: radioValue } = useControlNode(audioContext)

  const [source, setSource] = useState<MediaElementAudioSourceNode>();

  const [isInitialised, setIsInitialised] = useState(false);

  useEffect(() => {
    if (!mediaElement.current) {
      return
    }
    if (!isInitialised) {
      return;
    }

    const canPlay = new Promise((r) => {
      mediaElement.current?.addEventListener("play", r);
    });

    (async () => {
      await canPlay;
      const source = new MediaElementAudioSourceNode(audioContext, {
        //@ts-ignore
        mediaElement: mediaElement.current,
      });
      setSource(source)
    })()

  }, [mediaElement, audioContext, isInitialised])

  useEffect(() => {
    if (!source) {
      return
    }

    (async () => {
      const destroyer = await loadEffect("destroyer", audioContext);
      destroyerDryWet.connect(destroyer.inputs.dryWet);

      const radio = await loadEffect("radio", audioContext);
      radioDryWet.connect(radio.inputs.dryWet);

      source.connect(destroyer.inputs.in);
      destroyer.outputs.out.connect(radio.inputs.in);

      radio.outputs.out.connect(audioContext.destination);
    })()
  }, [source, isInitialised, destroyerDryWet, radioDryWet]);

  return (
    <div>
      <h1>SDK Test page</h1>
      <audio onCanPlay={() => setIsInitialised(true)} ref={mediaElement} id="audio" controls src={'/sample.mp3'}></audio>
      <div style={{ display: 'flex' }}>
        <label>
          destroyer
          <input
            id="slider-destroyer"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={destroyerValue}
            style={{ display: 'block' }}
            //@ts-ignore
            onInput={({ target }) => setDestroyerValue(+target.value)}
          />
        </label>
        <label>
          radio
          <input
            id="slider-radio"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={radioValue}
            style={{ display: 'block' }}
            //@ts-ignore
            onInput={({ target }) => setRadioValue(+target.value)}
          />
        </label>
      </div>
    </div>
  )
}

export default Demo;

