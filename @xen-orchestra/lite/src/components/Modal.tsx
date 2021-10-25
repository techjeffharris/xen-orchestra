import React from 'react'
import { Dialog, DialogContent, DialogContentText, DialogActions, DialogTitle } from '@mui/material'
import { withState } from 'reaclette'

import Button from './Button'
import Icon, { IconName } from './Icon'
import IntlMessage from './IntlMessage'

type ModalButton = {
  label: React.ReactNode
  level: string
  reason?: unknown
  value?: unknown
}

interface GeneralParamsModal {
  icon: IconName
  message: string | JSX.Element
  title: string | JSX.Element
}

interface ModalParams extends GeneralParamsModal {
  buttonList: ModalButton[]
}

let instance: EffectContext<State, Props, Effects, Computed, ParentState, ParentEffects> | undefined
const modal = ({ buttonList, icon, message, title }: ModalParams) =>
  new Promise((resolve, reject) => {
    if (instance === undefined) {
      throw new Error('No modal instance')
    }
    instance.state.buttonList = buttonList
    instance.state.icon = icon
    instance.state.message = message
    instance.state.onReject = reject
    instance.state.onSuccess = resolve
    instance.state.showModal = true
    instance.state.title = title
  })

export const alert = (params: GeneralParamsModal): Promise<unknown> => {
  const buttonList = [
    {
      label: <IntlMessage id='ok' />,
      level: 'primary',
      value: 'success',
    },
  ]
  return modal({ ...params, buttonList })
}

export const confirm = (params: GeneralParamsModal): Promise<unknown> => {
  const buttonList = [
    {
      label: <IntlMessage id='confirm' />,
      level: 'primary',
      value: 'success',
    },
    {
      label: <IntlMessage id='cancel' />,
      level: 'danger',
      reason: 'reject',
    },
  ]
  return modal({ ...params, buttonList })
}

interface ParentState {}

interface State {
  buttonList?: ModalButton[]
  icon?: IconName
  message?: string | JSX.Element
  onReject?: (reason: unknown) => void
  onSuccess?: (value: unknown) => void
  showModal: boolean
  title?: string | JSX.Element
}

interface Props {}

interface ParentEffects {}

interface Effects {
  _closeModal: () => void
  _reject: (reason: unknown) => void
}

interface Computed {
  buttons?: ((cb: () => void) => JSX.Element)[]
}

const Modal = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    initialState: () => ({
      buttonList: undefined,
      icon: undefined,
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
      _reject: function (reason) {
        this.state.onReject?.(reason)
        this.effects._closeModal()
      },
    },
    computed: {
      buttons: ({ buttonList, onSuccess, onReject }) =>
        buttonList?.map((button, index) => {
          const _button = (cb: () => void) => {
            const onClick = () => {
              if (button.value !== undefined) {
                onSuccess?.(button.value)
              } else {
                onReject?.(button.reason)
              }
              cb()
            }
            return (
              <Button key={index} onClick={onClick}>
                {button.label}
              </Button>
            )
          }
          return _button
        }),
    },
  },
  ({ effects, state }) => {
    const { _closeModal, _reject } = effects
    const { buttons, icon, message, showModal, title } = state

    return showModal ? (
      <Dialog open={showModal} onClose={_reject}>
        <DialogTitle>
          {icon !== undefined && <Icon icon={icon} />} {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
        <DialogActions>{buttons?.map(button => button(_closeModal))}</DialogActions>
      </Dialog>
    ) : null
  }
)

export default Modal
