/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: BUSL-1.1
 */

import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { hbs } from 'ember-cli-htmlbars';
import { componentA11yAudit } from 'nomad-ui/tests/helpers/a11y-audit';
import { click, typeIn, find, findAll, render } from '@ember/test-helpers';
import { setupMirage } from 'ember-cli-mirage/test-support';
import setupCodeMirror from 'nomad-ui/tests/helpers/codemirror';
import { codeFillable, code } from 'nomad-ui/tests/pages/helpers/codemirror';
import percySnapshot from '@percy/ember';
import { clickToggle, clickOption } from 'nomad-ui/tests/helpers/helios';

import faker from 'nomad-ui/mirage/faker';

module('Integration | Component | variable-form', function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);
  setupCodeMirror(hooks);

  test('passes an accessibility audit', async function (assert) {
    assert.expect(1);
    this.set(
      'mockedModel',
      server.create('variable', {
        keyValues: [{ key: '', value: '' }],
      })
    );
    await render(hbs`<VariableForm @model={{this.mockedModel}} />`);
    await componentA11yAudit(this.element, assert);
  });

  test('shows a single row by default and modifies on "Add More" and "Delete"', async function (assert) {
    this.set(
      'mockedModel',
      server.create('variable', {
        keyValues: [{ key: '', value: '' }],
      })
    );
    assert.expect(7);

    await render(hbs`<VariableForm @model={{this.mockedModel}} />`);
    assert.equal(
      findAll('div.key-value').length,
      1,
      'A single KV row exists by default'
    );

    assert
      .dom('[data-test-add-kv]')
      .isDisabled(
        'The "Add More" button is disabled until key and value are filled'
      );

    await typeIn('[data-test-var-key]', 'foo');

    assert
      .dom('[data-test-add-kv]')
      .isDisabled(
        'The "Add More" button is still disabled with only key filled'
      );

    await typeIn('[data-test-var-value]', 'bar');

    assert
      .dom('[data-test-add-kv]')
      .isNotDisabled(
        'The "Add More" button is no longer disabled after key and value are filled'
      );

    await click('[data-test-add-kv]');

    assert.equal(
      findAll('div.key-value').length,
      2,
      'A second KV row exists after adding a new one'
    );

    await typeIn('.key-value:last-of-type [data-test-var-key]', 'foo');
    await typeIn('.key-value:last-of-type [data-test-var-value]', 'bar');
    await click('[data-test-add-kv]');

    assert.equal(
      findAll('div.key-value').length,
      3,
      'A third KV row exists after adding a new one'
    );

    await click('.delete-entry-button');

    assert.equal(
      findAll('div.key-value').length,
      2,
      'Back down to two rows after hitting delete'
    );
  });

  module('editing and creating new key/value pairs', function () {
    test('it should allow each key/value row to toggle password visibility', async function (assert) {
      faker.seed(1);
      this.set(
        'mockedModel',
        server.create('variable', {
          keyValues: [{ key: 'foo', value: 'bar' }],
        })
      );

      assert.expect(6);

      await render(hbs`<VariableForm @model={{this.mockedModel}} />`);
      await click('[data-test-add-kv]'); // add a second variable

      findAll('.value-label').forEach((label, iter) => {
        const maskedInput = label.querySelector('.hds-form-masked-input');
        assert.ok(
          maskedInput.classList.contains('hds-form-masked-input--is-masked'),
          `Value ${iter + 1} is hidden by default`
        );
      });

      await click('.hds-form-visibility-toggle');
      const [firstRow, secondRow] = findAll('.hds-form-masked-input');

      assert.ok(
        firstRow.classList.contains('hds-form-masked-input--is-not-masked'),
        'Only the row that is clicked on toggles visibility'
      );
      assert.ok(
        secondRow.classList.contains('hds-form-masked-input--is-masked'),
        'Rows that are not clicked remain obscured'
      );

      await click('.hds-form-visibility-toggle');
      assert.ok(
        firstRow.classList.contains('hds-form-masked-input--is-masked'),
        'Only the row that is clicked on toggles visibility'
      );
      assert.ok(
        secondRow.classList.contains('hds-form-masked-input--is-masked'),
        'Rows that are not clicked remain obscured'
      );
      await percySnapshot(assert);
    });
  });

  test('Existing variable shows properties by default', async function (assert) {
    assert.expect(13);
    const keyValues = [
      { key: 'my-completely-normal-key', value: 'never' },
      { key: 'another key, but with spaces', value: 'gonna' },
      { key: 'once/more/with/slashes', value: 'give' },
      { key: 'and_some_underscores', value: 'you' },
      { key: 'and\\now/for-something_completely@different', value: 'up' },
    ];

    this.set(
      'mockedModel',
      server.create('variable', {
        path: 'my/path/to',
        keyValues,
      })
    );
    await render(hbs`<VariableForm @model={{this.mockedModel}} />`);
    assert.equal(
      findAll('div.key-value').length,
      5,
      'Shows 5 existing key values'
    );
    assert.equal(
      findAll('.delete-entry-button').length,
      5,
      'Shows "delete" for all five rows'
    );
    assert.equal(
      findAll('[data-test-add-kv]').length,
      1,
      'Shows "add more" only on the last row'
    );

    findAll('div.key-value').forEach((row, idx) => {
      assert.equal(
        row.querySelector(`[data-test-var-key]`).value,
        keyValues[idx].key,
        `Key ${idx + 1} is correct`
      );

      assert.equal(
        row.querySelector(`[data-test-var-value]`).value,
        keyValues[idx].value,
        keyValues[idx].value
      );
    });
  });

  test('Prevent editing path input on existing variables', async function (assert) {
    assert.expect(3);

    const variable = await this.server.create('variable', {
      name: 'foo',
      namespace: 'bar',
      path: '/baz/bat',
      keyValues: [{ key: '', value: '' }],
    });
    variable.isNew = false;
    this.set('variable', variable);
    await render(hbs`<VariableForm @model={{this.variable}} />`);
    assert.dom('[data-test-path-input]').hasValue('/baz/bat', 'Path is set');
    assert
      .dom('[data-test-path-input]')
      .isDisabled('Existing variable is in disabled state');

    variable.isNew = true;
    variable.path = '';
    this.set('variable', variable);
    await render(hbs`<VariableForm @model={{this.variable}} />`);
    assert
      .dom('[data-test-path-input]')
      .isNotDisabled('New variable is not in disabled state');
  });

  module('Validation', function () {
    test('warns when you try to create a path that already exists', async function (assert) {
      this.server.createList('namespace', 3);

      this.set(
        'mockedModel',
        server.create('variable', {
          path: '',
          keyValues: [{ key: '', value: '' }],
        })
      );

      server.create('variable', {
        path: 'baz/bat',
      });
      server.create('variable', {
        path: 'baz/bat/qux',
        namespace: server.db.namespaces[2].id,
      });

      this.set('existingVariables', server.db.variables.toArray());

      await render(
        hbs`<VariableForm @model={{this.mockedModel}} @existingVariables={{this.existingVariables}} />`
      );

      await typeIn('[data-test-path-input]', 'foo/bar');
      assert.dom('[data-test-duplicate-variable-error]').doesNotExist();
      assert
        .dom('[data-test-path-input]')
        .doesNotHaveClass('hds-form-text-input--is-invalid');

      document.querySelector('[data-test-path-input]').value = ''; // clear current input
      await typeIn('[data-test-path-input]', 'baz/bat');

      assert.dom('[data-test-duplicate-variable-error]').exists();
      assert
        .dom('[data-test-path-input]')
        .hasClass('hds-form-text-input--is-invalid');

      await clickToggle('[data-test-variable-namespace-filter]');
      await clickOption(
        '[data-test-variable-namespace-filter]',
        server.db.namespaces[2].id
      );
      assert.dom('[data-test-duplicate-variable-error]').doesNotExist();
      assert
        .dom('[data-test-path-input]')
        .doesNotHaveClass('hds-form-text-input--is-invalid');

      document.querySelector('[data-test-path-input]').value = ''; // clear current input
      await typeIn('[data-test-path-input]', 'baz/bat/qux');
      assert.dom('[data-test-duplicate-variable-error]').exists();
      assert
        .dom('[data-test-path-input]')
        .hasClass('hds-form-text-input--is-invalid');
    });

    test('warns you when you set a key with . in it', async function (assert) {
      this.set(
        'mockedModel',
        server.create('variable', {
          keyValues: [{ key: '', value: '' }],
        })
      );

      const testCases = [
        {
          name: 'valid key',
          key: 'superSecret2',
          warn: false,
        },
        {
          name: 'invalid key with dot',
          key: 'super.secret',
          warn: true,
        },
        {
          name: 'invalid key with slash',
          key: 'super/secret',
          warn: true,
        },
        {
          name: 'invalid key with emoji',
          key: 'supersecretspy🕵️',
          warn: true,
        },
        {
          name: 'unicode letters',
          key: '世界',
          warn: false,
        },
        {
          name: 'unicode numbers',
          key: '٣٢١',
          warn: false,
        },
        {
          name: 'unicode letters and numbers',
          key: '世٢界١',
          warn: false,
        },
      ];
      for (const tc of testCases) {
        await render(hbs`<VariableForm @model={{this.mockedModel}} />`);
        await typeIn('[data-test-var-key]', tc.key);
        if (tc.warn) {
          assert.dom('.key-value-error').exists(tc.name);
        } else {
          assert.dom('.key-value-error').doesNotExist(tc.name);
        }
      }
    });

    test('warns you when you create a duplicate key', async function (assert) {
      this.set(
        'mockedModel',
        server.create('variable', {
          keyValues: [{ key: 'myKey', value: 'myVal' }],
        })
      );

      await render(hbs`<VariableForm @model={{this.mockedModel}} />`);

      await click('[data-test-add-kv]');

      const secondKey = document.querySelectorAll('[data-test-var-key]')[1];
      await typeIn(secondKey, 'myWonderfulKey');
      assert.dom('.key-value-error').doesNotExist();

      secondKey.value = '';

      await typeIn(secondKey, 'myKey');
      assert.dom('.key-value-error').exists();
    });
  });

  module('Views', function () {
    test('Allows you to swap between JSON and Key/Value Views', async function (assert) {
      this.set(
        'mockedModel',
        server.create('variable', {
          path: '',
          keyValues: [{ key: '', value: '' }],
        })
      );

      this.set(
        'existingVariables',
        server.createList('variable', 1, {
          path: 'baz/bat',
        })
      );

      this.set('view', 'table');

      await render(
        hbs`<VariableForm @model={{this.mockedModel}} @existingVariables={{this.existingVariables}} @view={{this.view}} />`
      );
      assert.dom('.key-value').exists();
      assert.dom('.CodeMirror').doesNotExist();

      this.set('view', 'json');
      assert.dom('.key-value').doesNotExist();
      assert.dom('.CodeMirror').exists();
    });

    test('Persists Key/Values table data to JSON', async function (assert) {
      faker.seed(1);
      assert.expect(2);
      const keyValues = [
        { key: 'foo', value: '123' },
        { key: 'bar', value: '456' },
      ];
      this.set(
        'mockedModel',
        server.create('variable', {
          path: '',
          keyValues,
        })
      );

      this.set('view', 'json');

      await render(
        hbs`<VariableForm @model={{this.mockedModel}} @view={{this.view}} />`
      );

      await percySnapshot(assert);

      const keyValuesAsJSON = keyValues.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {});

      assert.equal(
        code('.editor-wrapper').get(),
        JSON.stringify(keyValuesAsJSON, null, 2),
        'JSON editor contains the key values, stringified, by default'
      );

      this.set('view', 'table');

      await click('[data-test-add-kv]');

      await typeIn('.key-value:last-of-type [data-test-var-key]', 'howdy');
      await typeIn('.key-value:last-of-type [data-test-var-value]', 'partner');

      this.set('view', 'json');

      assert.ok(
        code('[data-test-json-editor]').get().includes('"howdy": "partner"'),
        'JSON editor contains the new key value'
      );
    });

    test('Persists JSON data to Key/Values table', async function (assert) {
      const keyValues = [{ key: '', value: '' }];
      this.set(
        'mockedModel',
        server.create('variable', {
          path: '',
          keyValues,
        })
      );

      this.set('view', 'json');

      await render(
        hbs`<VariableForm @model={{this.mockedModel}} @view={{this.view}} />`
      );

      codeFillable('[data-test-json-editor]').get()(
        JSON.stringify({ golden: 'gate' }, null, 2)
      );
      this.set('view', 'table');
      assert.equal(
        find(`.key-value:last-of-type [data-test-var-key]`).value,
        'golden',
        'Key persists from JSON to Table'
      );

      assert.equal(
        find(`.key-value:last-of-type [data-test-var-value]`).value,
        'gate',
        'Value persists from JSON to Table'
      );
    });
  });
});
