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
  renderings?: JSX.Element[]
  renderOption: (item: any, additionalProps?: AdditionalProps) => React.ReactNode
  renderValue: (item: any, additionalProps?: AdditionalProps) => number | string
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
      renderings: (state, { additionalProps, options }) =>
        options?.map(item => {
          const render =
            typeof state.renderOption(item, additionalProps) === 'object'
              ? item.name ?? item.label ?? item.name_label ?? undefined
              : state.renderOption(item, additionalProps)
          const value =
            typeof state.renderValue(item, additionalProps) === 'object'
              ? item.value ?? item.id ?? item.$id ?? undefined
              : state.renderValue(item, additionalProps)

          if (render === undefined) {
            console.error('optionRenderer is undefined')
          }
          if (value === undefined) {
            console.error('valueRenderer is undefined')
          }

          return (
            <MenuItem key={value} value={value}>
              {render}
            </MenuItem>
          )
        }),
      // @ts-ignore
      renderOption: (_, { optionRenderer }) => iteratee(optionRenderer),
      // @ts-ignore
      renderValue: (_, { valueRenderer }) => iteratee(valueRenderer),
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
        {state.renderings?.map(rendering => rendering)}
      </SelectMaterialUi>
    </FormControl>
  )
)

export default Select
