import React from 'react'
import styled from 'styled-components'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { materialDark as codeStyle } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { withState } from 'reaclette'

import Button from '../../components/Button'
import Icon from '../../components/Icon'
import { alert, confirm } from '../../components/Modal'
import IntlMessage from '../../components/IntlMessage'

interface ParentState {}

interface State {}

interface Props {}

interface ParentEffects {}

interface Effects {
  sayHello: () => void
}

interface Computed {}

const Page = styled.div`
  margin: 30px;
`

const Container = styled.div`
  display: flex;
  column-gap: 10px;
`

const Render = styled.div`
  flex: 1;
  padding: 20px;
  border: solid 1px gray;
  border-radius: 3px;
`

const Code = styled(SyntaxHighlighter).attrs(() => ({
  language: 'jsx',
  style: codeStyle,
}))`
  flex: 1;
  border-radius: 3px;
  margin: 0 !important;
`

const App = withState<State, Props, Effects, Computed, ParentState, ParentEffects>(
  {
    effects: {
      sayHello: () => alert('hello'),
    },
  },
  ({ effects }) => (
    <Page>
      <h2>Button</h2>
      <Container>
        <Render>
          <Button onClick={effects.sayHello}>Button</Button>
        </Render>
        <Code>{`<Button onClick={doSomething}>
  Button
</Button>`}</Code>
      </Container>
      <h2>Icon</h2>
      <Container>
        <Render>
          <Icon icon='truck' />
          <Icon icon='truck' size='2x' />
        </Render>
        <Code>{`// https://fontawesome.com/icons
<Icon icon='truck' />
<Icon icon='truck' size='2x' />`}</Code>
      </Container>
      <h2>Modal</h2>
      <Container>
        <Render>
          <Button onClick={() => alert({ message: 'This is a alert message', title: 'Alert modal', icon: 'info' })}>
            Alert
          </Button>
          <Button
            onClick={() =>
              confirm({
                message: 'This is a confirm modal test',
                title: 'Confirm modal',
                icon: 'download',
              })
            }
          >
            Confirm
          </Button>
        </Render>
        <Code>{`<Button>Button></Button>`}</Code>
      </Container>
    </Page>
  )
)

export default App
