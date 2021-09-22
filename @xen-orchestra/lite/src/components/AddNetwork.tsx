import React, { ChangeEvent, FormEventHandler } from 'react'
import { Map } from 'immutable'
import { withState } from 'reaclette'

import Button from './Button'
import Input from './Input'
import IntlMessage from './IntlMessage'
import Select, { Options } from './Select'
import { alert } from './Modal'

import XapiConnection, { ObjectsByType, Pif, PifMetrics } from '../libs/xapi'

interface ParentState {
  objectsByType: ObjectsByType
  objectsFetched: boolean
  xapi: XapiConnection
}

interface State {
  formRef: React.RefObject<HTMLFormElement>
  isBonded: boolean
  form: {
    [key: string]: unknown
    bondMode: 'balance-slb' | 'active-backup' | 'lacp' | ''
    description: string
    mtu: string
    nameLabel: string
    vlan: string
    pifsId: string | string[]
  }
  pifsIdRef: React.RefObject<any>
}

interface Props {}

interface ParentEffects {}

interface Effects {
  _createNetwork: FormEventHandler<HTMLFormElement>
  _resetForm: () => void
  _toggleBonded: () => void
  _handleChange: (e: ChangeEvent<any>) => void
}

interface Computed {
  collection?: Pif[]
  pifs?: Map<string, Pif>
  pifsMetrics?: Map<string, PifMetrics>
}

const OPTIONS_RENDER_PIF: Options<Pif> = {
  render: (pif, additionalProps) =>
    `${pif.device} (${
      additionalProps?.pifsMetrics?.find((metrics: PifMetrics) => metrics.$ref === pif.metrics)?.device_name ??
      'unknown'
    })`,
  value: pif => pif.$id,
}
const OPTIONS_RENDER_BOND_MODE: Options<string> = {
  render: mode => mode,
  value: mode => mode,
}
const BOND_MODE = ['balance-slb', 'active-backup', 'lacp']

const AddNetwork = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    initialState: () => ({
      formRef: React.createRef(),
      isBonded: false,
      form: {
        bondMode: '',
        description: '',
        mtu: '',
        nameLabel: '',
        vlan: '',
        pifsId: ''
      },
      pifsIdRef: React.createRef(),
    }),
    computed: {
      pifs: state => state.objectsByType.get('PIF'),
      pifsMetrics: state => state.objectsByType.get('PIF_metrics'),
      collection: state =>
        state.pifs
          ?.filter(pif => pif.VLAN === -1 && pif.bond_slave_of === 'OpaqueRef:NULL' && pif.host === pif.$pool.master)
          .sortBy(pif => pif.device)
          .valueSeq()
          .toArray(),
    },
    effects: {
      _handleChange: function (e) {
        // Reason why values are initialized with empty string and not a undefined value
        // Warning: A component is changing an uncontrolled input to be controlled.
        // This is likely caused by the value changing from undefined to a defined value,
        // which should not happen. Decide between using a controlled or uncontrolled input
        // element for the lifetime of the component.
        // More info: https://reactjs.org/link/controlled-components
        const stateProperty = e.target.name
        const form = this.state.form

        if (form[stateProperty] !== undefined) {
          this.state.form = {
            ...form,
            [stateProperty]: e.target.value,
          }
        }
      },
      _createNetwork: async function (e) {
        e.preventDefault()

        const { nameLabel, vlan, mtu, bondMode, description, pifsId } = this.state.form
        // const { current } = this.state.formRef
        // const pifsId: string | string[] | undefined = this.state.isBonded
        //   ? Array.from<HTMLOptionElement>(current?.pif.selectedOptions).map(({ value }) => value)
        //   : current?.pif.value

        try {
          await this.state.xapi.createNetwork(
            {
              name_label: nameLabel,
              name_description: description,
              MTU: +mtu,
              VLAN: +vlan,
            },
            { pifsId, bondMode: bondMode === '' ? undefined : bondMode }
          )
          this.state.form.pifsId = ''
          this.effects._resetForm()
        } catch (error) {
          if(error instanceof Error){
            alert({ message: <p>{error.message}</p>, title: <IntlMessage id='networkCreation' /> })
          }
          throw error
        }
      },
      _resetForm: function () {
        Object.keys(this.state.form).forEach(key => {
          this.state.form = {
            ...this.state.form,
            [key]: '',
          }
        })
        this.state.isBonded = false
      },
      _toggleBonded: function () {
        if(Array.isArray(this.state.form.pifsId)){
          this.state.form.pifsId = ''
        } else {
          this.state.form.pifsId = []
        }
        this.state.isBonded = !this.state.isBonded
      },
    },
  },
  ({ effects, state }) => (
    <>
      <form onSubmit={effects._createNetwork} ref={state.formRef}>
        <div>
          <label>
            <IntlMessage id='bondedNetwork' />
          </label>
          <Input checked={state.isBonded} name='bonded' onChange={effects._toggleBonded} type='checkbox' />
        </div>
        <div>
          <label>
            <IntlMessage id='interface' />
          </label>
          <Select
          displayEmpty
            additionalProps={{ pifsMetrics: state.pifsMetrics }}
            options={state.collection}
            multiple={state.isBonded}
            name='pifsId'
            onChange={effects._handleChange}
            value={state.form.pifsId}
            optionsRender={OPTIONS_RENDER_PIF}
            placeholder='selectPif'
            required={state.isBonded}
          />
        </div>
        <div>
          <label>
            <IntlMessage id='name' />
          </label>
          <Input
            name='nameLabel'
            required
            type='text'
            value={state.form.nameLabel}
            onChange={effects._handleChange}
          />
        </div>
        <div>
          <label>
            <IntlMessage id='description' />
          </label>
          <Input
            name='description'
            value={state.form.description}
            type='text'
            onChange={effects._handleChange}
          />
        </div>
        <div>
          <label>
            <IntlMessage id='mtu' />
          </label>
          <IntlMessage id='defaultValue' values={{ value: 1500 }}>
            {message => (
              <Input
                name='mtu'
                placeholder={message?.toString()}
                type='number'
                value={state.form.mtu}
                onChange={effects._handleChange}
              />
            )}
          </IntlMessage>
        </div>
        {state.isBonded ? (
          <div>
            <label>
              <IntlMessage id='bondMode' />
            </label>
            <Select
            onChange={effects._handleChange}
              value={state.form.bondMode}
              options={BOND_MODE}
              name='bondMode'
              optionsRender={OPTIONS_RENDER_BOND_MODE}
              placeholder='selectBondMode'
              required
            />
          </div>
        ) : (
          <div>
            <label>
              <IntlMessage id='vlan' />
            </label>
            <IntlMessage id='vlanPlaceholder'>
              {message => (
                <Input
                  name='vlan'
                  placeholder={message?.toString()}
                  type='number'
                  value={state.form.vlan}
                  onChange={effects._handleChange}
                />
              )}
            </IntlMessage>
          </div>
        )}
        <Button type='submit'>
          <IntlMessage id='create' />
        </Button>
      </form>
      <Button onClick={effects._resetForm}>
        <IntlMessage id='reset' />
      </Button>
    </>
  )
)

export default AddNetwork
