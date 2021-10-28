import React from 'react'
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
  isBonded: boolean
  isLoading: boolean
  form: {
    [key: string]: unknown
    bondMode: 'active-backup' | 'balance-slb' | 'lacp' | ''
    description: string
    mtu: string
    nameLabel: string
    pifsId: string | string[]
    vlan: string
  }
}

interface Props {}

interface ParentEffects {}

interface Effects {
  _createNetwork: React.FormEventHandler<HTMLFormElement>
  _handleChange: (e: React.ChangeEvent<any>) => void
  _resetForm: () => void
  _toggleBonded: () => void
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

const OPTIONS_RENDER_BOND_MODE: Options<State['form']['bondMode']> = {
  render: mode => mode,
  value: mode => mode,
}

const BOND_MODE = ['balance-slb', 'active-backup', 'lacp']

const AddNetwork = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    initialState: () => ({
      isBonded: false,
      isLoading: false,
      form: {
        bondMode: '',
        description: '',
        mtu: '',
        nameLabel: '',
        pifsId: '',
        vlan: '',
      },
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
      _createNetwork: async function (e) {
        e.preventDefault()
        if (this.state.isLoading) {
          return alert({ message: <p>Network is already in creation</p>, title: <IntlMessage id='networkCreation' /> })
        }
        this.state.isLoading = true
        const { bondMode, description, mtu, nameLabel, pifsId, vlan } = this.state.form

        try {
          await this.state.xapi.createNetwork(
            {
              MTU: +mtu,
              name_description: description,
              name_label: nameLabel,
              VLAN: +vlan,
            },
            { bondMode: bondMode === '' ? undefined : bondMode, pifsId: pifsId === '' ? undefined : pifsId }
          )
          this.effects._resetForm()
        } catch (error) {
          console.error(error)
          if (error instanceof Error) {
            alert({ message: <p>{error.message}</p>, title: <IntlMessage id='networkCreation' /> })
          }
        }
        this.state.isLoading = false
      },
      _handleChange: function (e) {
        // Reason why form values are initialized with empty string and not a undefined value
        // Warning: A component is changing an uncontrolled input to be controlled.
        // This is likely caused by the value changing from undefined to a defined value,
        // which should not happen. Decide between using a controlled or uncontrolled input
        // element for the lifetime of the component.
        // More info: https://reactjs.org/link/controlled-components
        const property = e.target.name
        const { form } = this.state

        if (form[property] !== undefined) {
          this.state.form = {
            ...form,
            [property]: e.target.value,
          }
        }
      },
      _resetForm: function () {
        this.state.isBonded = false
        Object.keys(this.state.form).forEach(property => {
          this.state.form = {
            ...this.state.form,
            [property]: '',
          }
        })
      },
      _toggleBonded: function () {
        if (Array.isArray(this.state.form.pifsId)) {
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
      <form onSubmit={effects._createNetwork}>
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
          {/* <Select
            additionalProps={{ pifsMetrics: state.pifsMetrics }}
            multiple={state.isBonded}
            name='pifsId'
            onChange={effects._handleChange}
            options={state.collection}
            optionsRender={OPTIONS_RENDER_PIF}
            placeholder='selectPif'
            required={state.isBonded}
            value={state.form.pifsId}
          /> */}
        </div>
        <div>
          <label>
            <IntlMessage id='name' />
          </label>
          <Input name='nameLabel' onChange={effects._handleChange} required type='text' value={state.form.nameLabel} />
        </div>
        <div>
          <label>
            <IntlMessage id='description' />
          </label>
          <Input name='description' onChange={effects._handleChange} type='text' value={state.form.description} />
        </div>
        <div>
          <label>
            <IntlMessage id='mtu' />
          </label>
          <IntlMessage id='defaultValue' values={{ value: 1500 }}>
            {message => (
              <Input
                name='mtu'
                onChange={effects._handleChange}
                placeholder={message?.toString()}
                type='number'
                value={state.form.mtu}
              />
            )}
          </IntlMessage>
        </div>
        {state.isBonded ? (
          <div>
            <label>
              <IntlMessage id='bondMode' />
            </label>
            {/* <Select
              name='bondMode'
              onChange={effects._handleChange}
              options={BOND_MODE}
              optionsRender={OPTIONS_RENDER_BOND_MODE}
              placeholder='selectBondMode'
              required
              value={state.form.bondMode}
            /> */}
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
                  onChange={effects._handleChange}
                  placeholder={message?.toString()}
                  type='number'
                  value={state.form.vlan}
                />
              )}
            </IntlMessage>
          </div>
        )}
        <Button type='submit' icon={state.isLoading ? 'spinner' : undefined} spin={state.isLoading}>
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
