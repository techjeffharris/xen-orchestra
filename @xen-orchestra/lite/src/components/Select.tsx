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
  options: any[] | undefined
  optionRenderer?: any
  valueRenderer?: any
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
    computed: {
      value: (_, { valueRenderer }) => iteratee(valueRenderer),
      render: (_, { optionRenderer }) => iteratee(optionRenderer),
    },
  },
  ({ additionalProps, displayEmpty = true, effects, multiple, options, required, resetState, state, ...props }) => {
    return (
      <FormControl className={useStyles().formControl}>
        <SelectMaterialUi multiple={multiple} required={required} displayEmpty={displayEmpty} {...props}>
          {!multiple && (
            <MenuItem value=''>
              <em>
                <IntlMessage id='none' />
              </em>
            </MenuItem>
          )}
          {options?.map(item => {
            const value =
              typeof state.value(item, additionalProps) === 'object'
                ? item.value ?? item.id ?? item.$id ?? console.error(`Please provide a valueRenderer props for ${item}`)
                : state.value(item, additionalProps)
            const render =
              typeof state.render(item, additionalProps) === 'object'
                ? item.name ??
                  item.label ??
                  item.nameLabel ??
                  console.error(`Please provide an optionRenderer props for ${item}`)
                : state.render(item, additionalProps)
            return (
              <MenuItem key={value} value={value}>
                {render}
              </MenuItem>
            )
          })}
        </SelectMaterialUi>
      </FormControl>
    )
  }
)

export default Select
