import {
  Space,
} from '@trendmicro/react-styled-ui';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import includes from 'lodash/includes';
import React, { Component } from 'react';
import { interpret } from 'xstate';
import api from 'app/api';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { Container } from 'app/components/GridSystem';
import { ModalProvider, ModalRoot } from 'app/components/Modal';
import Widget from 'app/components/Widget';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import {
  // Grbl
  GRBL,
  GRBL_MACHINE_STATE_IDLE,
  GRBL_MACHINE_STATE_RUN,
  // Marlin
  MARLIN,
  // Smoothie
  SMOOTHIE,
  SMOOTHIE_MACHINE_STATE_IDLE,
  SMOOTHIE_MACHINE_STATE_RUN,
  // TinyG
  TINYG,
  TINYG_MACHINE_STATE_READY,
  TINYG_MACHINE_STATE_STOP,
  TINYG_MACHINE_STATE_END,
  TINYG_MACHINE_STATE_RUN,
} from 'app/constants/controller';
import {
  WORKFLOW_STATE_RUNNING,
} from 'app/constants/workflow';
import Macro from './Macro';
import {
  MODAL_NONE,
  MODAL_ADD_MACRO,
  MODAL_EDIT_MACRO,
  MODAL_RUN_MACRO,
} from './constants';
import { ServiceContext } from './context';
import fetchMacrosMachine from './machines/fetchMacrosMachine';

class MacroWidget extends Component {
    static propTypes = {
      widgetId: PropTypes.string.isRequired,
      onFork: PropTypes.func.isRequired,
      onRemove: PropTypes.func.isRequired,
      sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
      this.setState({ minimized: true });
    };

    expand = () => {
      this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);

    state = this.getInitialState();

    fetchMacrosService = interpret(fetchMacrosMachine);

    toggleFullscreen = () => {
      this.setState(state => ({
        minimized: state.isFullscreen ? state.minimized : false,
        isFullscreen: !state.isFullscreen,
      }));
    };

    toggleMinimized = () => {
      this.setState(state => ({
        minimized: !state.minimized,
      }));
    };

    actions = {
      openModal: (name = MODAL_NONE, params = {}) => {
        this.setState({
          modal: {
            name: name,
            params: params
          }
        });
      },
      closeModal: () => {
        this.setState({
          modal: {
            name: MODAL_NONE,
            params: {}
          }
        });
      },
      updateModalParams: (params = {}) => {
        this.setState({
          modal: {
            ...this.state.modal,
            params: {
              ...this.state.modal.params,
              ...params
            }
          }
        });
      },
      addMacro: async ({ name, content }) => {
        try {
          let res;
          res = await api.macros.create({ name, content });
          res = await api.macros.fetch();
          const { records: macros } = res.body;
          this.setState({ macros: macros });
        } catch (err) {
          // Ignore error
        }
      },
      deleteMacro: async (id) => {
        try {
          let res;
          res = await api.macros.delete(id);
          res = await api.macros.fetch();
          const { records: macros } = res.body;
          this.setState({ macros: macros });
        } catch (err) {
          // Ignore error
        }
      },
      updateMacro: async (id, { name, content }) => {
        try {
          let res;
          res = await api.macros.update(id, { name, content });
          res = await api.macros.fetch();
          const { records: macros } = res.body;
          this.setState({ macros: macros });
        } catch (err) {
          // Ignore error
        }
      },
      runMacro: (id, { name }) => {
        controller.command('macro:run', id, controller.context, (err, data) => {
          if (err) {
            log.error(`Failed to run the macro: id=${id}, name="${name}"`);
            return;
          }
        });
      },
      loadMacro: async (id, { name }) => {
        try {
          let res;
          res = await api.macros.read(id);
          const { name } = res.body;
          controller.command('macro:load', id, controller.context, (err, data) => {
            if (err) {
              log.error(`Failed to load the macro: id=${id}, name="${name}"`);
              return;
            }

            log.debug(data); // TODO
          });
        } catch (err) {
          // Ignore error
        }
      },
      openAddMacroModal: () => {
        this.actions.openModal(MODAL_ADD_MACRO);
      },
      openRunMacroModal: (id) => {
        api.macros.read(id)
          .then((res) => {
            const { id, name, content } = res.body;
            this.actions.openModal(MODAL_RUN_MACRO, { id, name, content });
          });
      },
      openEditMacroModal: (id) => {
        api.macros.read(id)
          .then((res) => {
            const { id, name, content } = res.body;
            this.actions.openModal(MODAL_EDIT_MACRO, { id, name, content });
          });
      }
    };

    controllerEvents = {
      'config:change': () => {
        this.fetchMacros();
      },
      'serialport:open': (options) => {
        const { port } = options;
        this.setState({ port: port });
      },
      'serialport:close': (options) => {
        const initialState = this.getInitialState();
        this.setState(state => ({
          ...initialState,
          macros: [...state.macros]
        }));
      },
      'controller:state': (type, controllerState) => {
        this.setState(state => ({
          controller: {
            ...state.controller,
            type: type,
            state: controllerState
          }
        }));
      },
      'workflow:state': (workflowState) => {
        this.setState(state => ({
          workflow: {
            state: workflowState
          }
        }));
      }
    };

    fetchMacros = async () => {
      try {
        let res;
        res = await api.macros.fetch();
        const { records: macros } = res.body;
        this.setState({ macros: macros });
      } catch (err) {
        // Ignore error
      }
    };

    componentDidMount() {
      this.fetchMacrosService.start();
      this.addControllerEvents();
    }

    componentWillUnmount() {
      this.fetchMacrosService.stop();
      this.removeControllerEvents();
    }

    componentDidUpdate(prevProps, prevState) {
      const {
        minimized
      } = this.state;

      this.config.set('minimized', minimized);
    }

    getInitialState() {
      return {
        minimized: this.config.get('minimized', false),
        isFullscreen: false,
        port: controller.port,
        controller: {
          type: controller.type,
          state: controller.state
        },
        workflow: {
          state: controller.workflow.state
        },
        modal: {
          name: MODAL_NONE,
          params: {}
        },
        macros: []
      };
    }

    addControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.addListener(eventName, callback);
      });
    }

    removeControllerEvents() {
      Object.keys(this.controllerEvents).forEach(eventName => {
        const callback = this.controllerEvents[eventName];
        controller.removeListener(eventName, callback);
      });
    }

    canClick() {
      const { port, workflow } = this.state;
      const controllerType = this.state.controller.type;
      const controllerState = this.state.controller.state;

      if (!port) {
        return false;
      }
      if (workflow.state === WORKFLOW_STATE_RUNNING) {
        return false;
      }
      if (!includes([GRBL, MARLIN, SMOOTHIE, TINYG], controllerType)) {
        return false;
      }
      if (controllerType === GRBL) {
        const machineState = get(controllerState, 'status.machineState');
        const states = [
          GRBL_MACHINE_STATE_IDLE,
          GRBL_MACHINE_STATE_RUN
        ];
        if (!includes(states, machineState)) {
          return false;
        }
      }
      if (controllerType === MARLIN) {
        // Marlin does not have machine state
      }
      if (controllerType === SMOOTHIE) {
        const machineState = get(controllerState, 'status.machineState');
        const states = [
          SMOOTHIE_MACHINE_STATE_IDLE,
          SMOOTHIE_MACHINE_STATE_RUN
        ];
        if (!includes(states, machineState)) {
          return false;
        }
      }
      if (controllerType === TINYG) {
        const machineState = get(controllerState, 'sr.machineState');
        const states = [
          TINYG_MACHINE_STATE_READY,
          TINYG_MACHINE_STATE_STOP,
          TINYG_MACHINE_STATE_END,
          TINYG_MACHINE_STATE_RUN
        ];
        if (!includes(states, machineState)) {
          return false;
        }
      }

      return true;
    }

    render() {
      const { widgetId } = this.props;
      const { minimized, isFullscreen } = this.state;
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

      return (
        <WidgetConfigProvider widgetId={widgetId}>
          <ServiceContext.Provider
            value={{
              fetchMacrosService: this.fetchMacrosService,
            }}
          >
            <ModalProvider>
              <ModalRoot />
              <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                  <Widget.Title>
                    <Widget.Sortable className={this.props.sortable.handleClassName}>
                      <FontAwesomeIcon icon="bars" fixedWidth />
                      <Space width={4} />
                    </Widget.Sortable>
                    {isForkedWidget &&
                    <FontAwesomeIcon icon="code-branch" fixedWidth />
                    }
                    {i18n._('Macro')}
                  </Widget.Title>
                  <Widget.Controls className={this.props.sortable.filterClassName}>
                    <Widget.Button
                      disabled={isFullscreen}
                      title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                      onClick={this.toggleMinimized}
                    >
                      {minimized &&
                      <FontAwesomeIcon icon="chevron-down" fixedWidth />
                      }
                      {!minimized &&
                      <FontAwesomeIcon icon="chevron-up" fixedWidth />
                      }
                    </Widget.Button>
                    {isFullscreen && (
                      <Widget.Button
                        title={i18n._('Exit Full Screen')}
                        onClick={this.toggleFullscreen}
                      >
                        <FontAwesomeIcon icon="compress" fixedWidth />
                      </Widget.Button>
                    )}
                    <Widget.DropdownButton
                      title={i18n._('More')}
                      toggle={(
                        <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                      )}
                      onSelect={(eventKey) => {
                        if (eventKey === 'fullscreen') {
                          this.toggleFullscreen();
                        } else if (eventKey === 'fork') {
                          this.props.onFork();
                        } else if (eventKey === 'remove') {
                          this.props.onRemove();
                        }
                      }}
                    >
                      <Widget.DropdownMenuItem eventKey="fullscreen">
                        {!isFullscreen && (
                          <FontAwesomeIcon icon="expand" fixedWidth />
                        )}
                        {isFullscreen && (
                          <FontAwesomeIcon icon="compress" fixedWidth />
                        )}
                        <Space width={8} />
                        {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="fork">
                        <FontAwesomeIcon icon="code-branch" fixedWidth />
                        <Space width={8} />
                        {i18n._('Fork Widget')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="remove">
                        <FontAwesomeIcon icon="times" fixedWidth />
                        <Space width={8} />
                        {i18n._('Remove Widget')}
                      </Widget.DropdownMenuItem>
                    </Widget.DropdownButton>
                  </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                  style={{
                    display: (minimized ? 'none' : 'block'),
                  }}
                >
                  <Container
                    fluid
                    style={{
                      padding: '.75rem',
                    }}
                  >
                    <Macro />
                  </Container>
                </Widget.Content>
              </Widget>
            </ModalProvider>
          </ServiceContext.Provider>
        </WidgetConfigProvider>
      );
    }
}

export default MacroWidget;
