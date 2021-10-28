import React from 'react'
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles'
import { FormControl, MenuItem, Select as SelectMaterialUi, SelectProps } from '@material-ui/core'
import { iteratee } from 'lodash'
import { withState } from 'reaclette'

import IntlMessage from './IntlMessage'

type AdditionalProps = Record<string, any>

interface ParentState {}

interface State {}

interface Props extends SelectProps {
  additionalProps?: AdditionalProps
  onChange: (e: React.ChangeEvent<{ value: Props['value'] }>) => void
  optionRenderer?: string | { (item: any): number | string }
  options: any[] | undefined
  value: any
  valueRenderer?: string | { (item: any): number | string }
}

interface ParentEffects {}

interface Effects {}

interface Computed {
  renderOption: (item: any, additionalProps?: AdditionalProps) => React.ReactNode
  renderValue: (item: any, additionalProps?: AdditionalProps) => number | string
  selectOptions?: JSX.Element[]
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
    computed: {
      // @ts-ignore
      renderOption: (_, { optionRenderer }) => iteratee(optionRenderer),
      // @ts-ignore
      renderValue: (_, { valueRenderer }) => iteratee(valueRenderer),
      selectOptions: (state, { additionalProps, options, optionRenderer, valueRenderer }) =>
        options?.map(item => {
          const label =
            optionRenderer === undefined
              ? item.name ?? item.label ?? item.name_label
              : state.renderOption(item, additionalProps)
          const value =
            valueRenderer === undefined ? item.value ?? item.id ?? item.$id : state.renderValue(item, additionalProps)

          if (label === undefined) {
            console.error('optionRenderer is undefined')
          }
          if (value === undefined) {
            console.error('valueRenderer is undefined')
          }

          return (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          )
        }),
    },
  },
  ({ additionalProps, displayEmpty = true, effects, multiple, options, required, resetState, state, ...props }) => (
    <FormControl className={useStyles().formControl}>
      <SelectMaterialUi multiple={multiple} required={required} displayEmpty={displayEmpty} {...props}>
        {!multiple && (
          <MenuItem value=''>
            <em>
              <IntlMessage id='none' />
            </em>
          </MenuItem>
        )}
        {state.selectOptions}
      </SelectMaterialUi>
    </FormControl>
  )
)

export default Select
