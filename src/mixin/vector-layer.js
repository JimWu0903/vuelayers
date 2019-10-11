import { obsFromOlChangeEvent } from '../rx-ext'
import { pick } from '../util/minilo'
import mergeDescriptors from '../util/multi-merge-descriptors'
import layer from './layer'
import stylesContainer from './styles-container'

export default {
  mixins: [
    stylesContainer,
    layer,
  ],
  props: {
    // ol/layer/BaseVector
    /**
     * @type {function|undefined}
     */
    renderOrder: Function,
    /**
     * @type {number|undefined}
     */
    renderBuffer: {
      type: Number,
      default: 100,
    },
    /**
     * @type {boolean}
     */
    declutter: Boolean,
    /**
     * When set to `true`, feature batches will be recreated during animations.
     * @type {boolean}
     * @default false
     */
    updateWhileAnimating: Boolean,
    /**
     * When set to `true`, feature batches will be recreated during interactions.
     * @type {boolean}
     * @default false
     */
    updateWhileInteracting: Boolean,
  },
  watch: {
    renderOrder (value) {
      this.setLayerRenderOrder(value)
    },
    async renderBuffer (value) {
      if (value === await this.getLayerRenderBuffer()) return

      this.scheduleRecreate()
    },
    async declutter (value) {
      if (value === await this.getLayerDeclutter()) return

      this.scheduleRecreate()
    },
    async updateWhileAnimating (value) {
      if (value === await this.getLayerUpdateWhileAnimating()) return

      this.scheduleRecreate()
    },
    async updateWhileInteracting (value) {
      if (value === await this.getLayerUpdateWhileInteracting()) return

      this.scheduleRecreate()
    },
  },
  methods: {
    /**
     * @returns {Promise<boolean>}
     */
    async getLayerDeclutter () {
      return (await this.resolveLayer()).getDeclutter()
    },
    /**
     * @returns {Promise<number>}
     */
    async getLayerRenderBuffer () {
      return (await this.resolveLayer()).getRenderBuffer()
    },
    /**
     * @returns {Promise<function>}
     */
    async getLayerRenderOrder () {
      return (await this.resolveLayer()).getRenderOrder()
    },
    /**
     * @param {function} renderOrder
     * @returns {Promise<void>}
     */
    async setLayerRenderOrder (renderOrder) {
      const layer = await this.resolveLayer()

      if (renderOrder === layer.getRenderOrder()) return

      layer.setRenderOrder(renderOrder)
    },
    /**
     * @returns {Promise<boolean>}
     */
    async getLayerUpdateWhileAnimating () {
      return (await this.resolveLayer()).getUpdateWhileAnimating()
    },
    /**
     * @returns {Promise<boolean>}
     */
    async getLayerUpdateWhileInteracting () {
      return (await this.resolveLayer()).getUpdateWhileInteracting()
    },
    /**
     * @return {Promise<module:ol/layer/BaseVector~BaseVectorLayer>}
     */
    getStyleTarget: layer.methods.resolveLayer,
    /**
     * @return {Promise<module:ol/style/Style~Style[]|module:ol/style/Style~StyleFunction|Vue|undefined>}
     */
    getLayerStyle: stylesContainer.methods.getStyles,
    /**
     * @param {Array<{style: module:ol/style/Style~Style, condition: (function|boolean|undefined)}>|module:ol/style/Style~StyleFunction|Vue|undefined} styles
     * @return {Promise<void>}
     */
    setLayerStyle: stylesContainer.methods.setStyle,
    /**
     * @returns {Object}
     * @protected
     */
    getServices () {
      return mergeDescriptors(
        this::layer.methods.getServices(),
        this::stylesContainer.methods.getServices(),
      )
    },
    /**
     * @returns {Promise<void>}
     */
    async subscribeAll () {
      await Promise.all(
        this::layer.methods.subscribeAll(),
        this::subscribeToLayerEvents(),
      )
    },
    ...pick(layer.methods, [
      'init',
      'deinit',
      'mount',
      'unmount',
      'refresh',
      'scheduleRefresh',
      'remount',
      'scheduleRemount',
      'recreate',
      'scheduleRecreate',
    ]),
  },
}

async function subscribeToLayerEvents () {
  const layer = await this.resolveLayer()

  const changes = obsFromOlChangeEvent(layer, [
    'renderOrder',
  ], true, 1000 / 60)

  this.subscribeTo(changes, ({ prop, value }) => {
    ++this.rev

    this.$emit(`update:${prop}`, value)
  })
}
