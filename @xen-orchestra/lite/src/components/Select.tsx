import React from 'react'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import { FormControl, MenuItem, Select as SelectMaterialUi, SelectProps } from '@material-ui/core'
import { iteratee } from 'lodash'
import { withState } from 'reaclette'

import IntlMessage from './IntlMessage'

type AdditionalProps = Record<string, any>

export type Options<T> = {
  render: { (item: T, additionalProps?: AdditionalProps): React.ReactNode } | keyof T
  value: { (item: T, additionalProps?: AdditionalProps): string | number } | keyof T
}

interface ParentState {}

interface State {
  getFromProperty: (property: string) => (item: any, additionalProps?: AdditionalProps) => any
}

interface Props extends SelectProps {
  additionalProps?: AdditionalProps
  onChange: (e: React.ChangeEvent<{ value: Props['value'] }>) => void
  options: any[] | undefined
  optionRender: Options<any>
  value: any
}

interface ParentEffects {}

interface Effects {}

interface Computed {
  value: (item: any, additionalProps?: AdditionalProps) => number | string
  render: (item: any, additionalProps?: AdditionalProps) => React.ReactNode
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
    },
  })
)

const Select = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    initialState: ({ optionRender }) => ({
      getFromProperty: (property: string) => (item, additionalProps) =>
        typeof iteratee(property)(optionRender) === 'string'
          ? item[iteratee(property)(optionRender)]
          : iteratee(property)(optionRender)(item, additionalProps),
    }),
    computed: {
      value: state => (item, additionalProps) => state.getFromProperty('value')(item, additionalProps),
      render: state => (item, additionalProps) => state.getFromProperty('render')(item, additionalProps),
    },
  },
  ({
    additionalProps,
    effects,
    multiple,
    options,
    optionRender,
    resetState,
    state,
    required,
    displayEmpty = true,
    ...props
  }) => (
    <FormControl className={useStyles().formControl}>
      <SelectMaterialUi multiple={multiple} required={required} displayEmpty={displayEmpty} {...props}>
        {!multiple && (
          <MenuItem value=''>
            <em>
              <IntlMessage id='none' />
            </em>
          </MenuItem>
        )}
        {options?.map(item => (
          <MenuItem key={state.value(item, additionalProps)} value={state.value(item, additionalProps)}>
            {state.render(item, additionalProps)}
          </MenuItem>
        ))}
      </SelectMaterialUi>
    </FormControl>
  )
)

export default Select
