import {
  Box,
  Space,
  TextLabel,
} from '@trendmicro/react-styled-ui';
import { useService } from '@xstate/react';
import _uniqueId from 'lodash/uniqueId';
import React, { useContext, useRef } from 'react';
import { Form, Field } from 'react-final-form';
import api from 'app/api';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import { Container, Row, Col } from 'app/components/GridSystem';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import Textarea from 'app/components/FormControl/Textarea';
import FormGroup from 'app/components/FormGroup';
import InlineError from 'app/components/InlineError';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import { composeValidators, required } from 'app/widgets/shared/validations';
import variables from '../shared/variables';
import { ServiceContext } from '../context';

const addMacro = async ({ name, content }) => {
  try {
    await api.macros.create({ name, content });
  } catch (err) {
    // Ignore error
  }
};

const NewMacro = ({
  onClose,
}) => {
  const { fetchMacrosService } = useContext(ServiceContext);
  const [, send] = useService(fetchMacrosService);
  const contentRef = useRef();
  const initialValues = {
    name: '',
    content: '',
  };

  return (
    <Modal size="md" onClose={onClose}>
      <Form
        initialValues={initialValues}
        onSubmit={async (values) => {
          const { name, content } = values;
          await addMacro({ name, content });
          send('FETCH');
          onClose();
        }}
        subscription={{}}
      >
        {({ form }) => (
          <Container>
            <Modal.Header>
              <Modal.Title>
                {i18n._('New Macro')}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Field
                name="name"
                validate={composeValidators(required)}
              >
                {({ input, meta }) => {
                  return (
                    <FormGroup>
                      <TextLabel mb="2x">
                        {i18n._('Macro Name')}
                      </TextLabel>
                      <Box>
                        <Input {...input} />
                      </Box>
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </FormGroup>
                  );
                }}
              </Field>
              <Field
                name="content"
                validate={composeValidators(required)}
              >
                {({ input, meta }) => {
                  return (
                    <FormGroup>
                      <Row style={{ alignItems: 'center' }}>
                        <Col>
                          <TextLabel mb="2x">
                            {i18n._('Macro Commands')}
                          </TextLabel>
                        </Col>
                        <Col width="auto">
                          <Dropdown
                            sm
                            pullRight
                            onSelect={(eventKey) => {
                              const textarea = contentRef.current;
                              if (!textarea) {
                                return;
                              }

                              const textToInsert = eventKey;
                              const caretPos = textarea.selectionStart;
                              const front = (textarea.value).substring(0, caretPos);
                              const back = (textarea.value).substring(textarea.selectionEnd, textarea.value.length);
                              const value = front + textToInsert + back;
                              input.onChange(value);
                            }}
                          >
                            <Dropdown.Toggle
                              btnStyle="link"
                              noCaret
                              style={{
                                padding: 0,
                                paddingBottom: '.5rem',
                              }}
                            >
                              <FontAwesomeIcon icon="plus" fixedWidth />
                              <Space width={8} />
                              {i18n._('Macro Variables')}
                              <Space width={4} />
                              <FontAwesomeIcon icon="caret-down" fixedWidth />
                            </Dropdown.Toggle>
                            <Dropdown.Menu
                              style={{
                                maxHeight: 180,
                                overflowY: 'auto'
                              }}
                            >
                              {variables.map(v => {
                                if (typeof v === 'object') {
                                  return (
                                    <MenuItem
                                      header={v.type === 'header'}
                                      key={_uniqueId()}
                                    >
                                      {v.text}
                                    </MenuItem>
                                  );
                                }

                                return (
                                  <MenuItem
                                    eventKey={v}
                                    key={_uniqueId()}
                                  >
                                    {v}
                                  </MenuItem>
                                );
                              })}
                            </Dropdown.Menu>
                          </Dropdown>
                        </Col>
                      </Row>
                      <Textarea
                        {...input}
                        ref={contentRef}
                        rows={10}
                      />
                      {(meta.error && meta.touched) && (
                        <InlineError>{meta.error}</InlineError>
                      )}
                    </FormGroup>
                  );
                }}
              </Field>
            </Modal.Body>
            <Modal.Footer>
              <Button
                btnStyle="default"
                onClick={onClose}
              >
                {i18n._('Cancel')}
              </Button>
              <Button
                btnStyle="primary"
                onClick={() => form.submit()}
              >
                {i18n._('OK')}
              </Button>
            </Modal.Footer>
          </Container>
        )}
      </Form>
    </Modal>
  );
};

export default NewMacro;
