import React from 'react'
import { Dialog, DialogContent, DialogContentText, DialogActions, DialogTitle } from '@mui/material'
import { withState } from 'reaclette'

import Button from './Button'
import IntlMessage from './IntlMessage'

type AdditionalButton = {
  index: number | string
  label: React.ReactNode
  onClick: () => void
}

interface GeneralParamsModal {
  additionalButton?: AdditionalButton[]
  displayCancelButton?: boolean
  message: JSX.Element
  title: JSX.Element
}

interface ParamsModal extends GeneralParamsModal {
  onReject: (reason?: unknown) => void
  onSuccess: (value: string) => void
}

let instance: EffectContext<State, Props, Effects, Computed, ParentState, ParentEffects> | undefined
const modal = ({ additionalButton, displayCancelButton = true, message, onReject, onSuccess, title }: ParamsModal) => {
  if (instance === undefined) {
    throw new Error('No modal instance')
  }

  instance.state.additionalButton = additionalButton
  instance.state.displayCancelButton = displayCancelButton
  instance.state.message = message
  instance.state.onReject = onReject
  instance.state.onSuccess = onSuccess
  instance.state.showModal = true
  instance.state.title = title
}

export const alert = (params: GeneralParamsModal): Promise<string> =>
  new Promise((resolve, reject) =>
    modal({ displayCancelButton: false, onReject: reject, onSuccess: resolve, ...params })
  )

export const confirm = (params: GeneralParamsModal): Promise<string> =>
  new Promise((resolve, reject) => modal({ onReject: reject, onSuccess: resolve, ...params }))

interface ParentState {}

interface State {
  additionalButton?: AdditionalButton[]
  displayCancelButton?: boolean
  message?: JSX.Element
  onReject?: () => void
  onSuccess?: (value: string) => void
  showModal: boolean
  title?: JSX.Element
}

interface Props {}

interface ParentEffects {}

interface Effects {
  _closeModal: () => void
  _reject: () => void
  _success: () => void
}

interface Computed {}

const Modal = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    initialState: () => ({
      additionalButton: undefined,
      displayCancelButton: false,
      message: undefined,
      onReject: undefined,
      onSuccess: undefined,
      showModal: false,
      title: undefined,
    }),
    effects: {
      initialize: function () {
        if (instance !== undefined) {
          throw new Error('Modal is a singelton')
        }
        instance = this
      },
      _closeModal: function () {
        this.state.showModal = false
      },
      _reject: function () {
        this.state.onReject?.()
        this.effects._closeModal()
      },
      _success: function () {
        this.state.onSuccess?.('Success')
        this.effects._closeModal()
      },
    },
  },
  ({ effects, state }) => {
    const { _reject, _success } = effects
    const { additionalButton, displayCancelButton, message, showModal, title } = state
    return showModal ? (
      <Dialog open={showModal} onClose={_reject}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          {displayCancelButton && (
            <Button onClick={_reject} color='primary'>
              <IntlMessage id='cancel' />
            </Button>
          )}
          <Button onClick={_success} color='primary'>
            <IntlMessage id='ok' />
          </Button>
          {additionalButton?.map(({ index, label, ...props }) => (
            <Button key={index} {...props}>
              {label}
            </Button>
          ))}
        </DialogActions>
      </Dialog>
    ) : null
  }
)

export default Modal
