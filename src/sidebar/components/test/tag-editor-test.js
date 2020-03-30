import { mount } from 'enzyme';
import { createElement } from 'preact';
import { act } from 'preact/test-utils';

import AutocompleteList from '../autocomplete-list';
import TagEditor from '../tag-editor';
import { $imports } from '../tag-editor';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('TagEditor', function () {
  let containers = [];
  let fakeTags = ['tag1', 'tag2'];
  let fakeTagsService;
  let fakeServiceUrl;
  let fakeOnEditTags;

  function createComponent(props) {
    // Use an array of containers so we can test more
    // than one component at a time.
    let newContainer = document.createElement('div');
    containers.push(newContainer);
    document.body.appendChild(newContainer);
    return mount(
      <TagEditor
        // props
        onEditTags={fakeOnEditTags}
        tagList={fakeTags}
        // service props
        serviceUrl={fakeServiceUrl}
        tags={fakeTagsService}
        {...props}
      />,
      { attachTo: newContainer }
    );
  }

  afterEach(function () {
    containers.forEach(container => {
      container.remove();
    });
    containers = [];
  });

  // Simulates a selection event from autocomplete-list
  function selectOption(wrapper, item) {
    act(() => {
      wrapper.find('AutocompleteList').props().onSelectItem(item);
    });
  }

  // Various keydown simulation helper methods
  function selectOptionViaEnter(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'Enter' });
  }
  function selectOptionViaDelimiter(wrapper) {
    wrapper.find('input').simulate('keydown', { key: ',' });
  }
  function selectOptionViaTab(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'Tab' });
  }
  function navigateDown(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'ArrowDown' });
  }
  function navigateUp(wrapper) {
    wrapper.find('input').simulate('keydown', { key: 'ArrowUp' });
  }
  // Simulates typing text
  function typeInput(wrapper) {
    wrapper.find('input').simulate('input', { inputType: 'insertText' });
  }

  beforeEach(function () {
    fakeOnEditTags = sinon.stub();
    fakeServiceUrl = sinon.stub().returns('http://serviceurl.com');
    fakeTagsService = {
      filter: sinon.stub().returns(['tag4', 'tag3']),
      store: sinon.stub(),
    };
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('adds appropriate tag values to the elements', () => {
    const wrapper = createComponent();
    wrapper.find('li').forEach((tag, i) => {
      assert.isTrue(tag.hasClass('tag-editor__item'));
      assert.equal(tag.text(), fakeTags[i]);
      assert.equal(tag.prop('aria-label'), `Tag: ${fakeTags[i]}`);
    });
  });

  it('generates an ordered autocomplete-list containing the array values returned from filter()', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'non-empty';
    typeInput(wrapper);
    assert.equal(wrapper.find('AutocompleteList').prop('list')[0], 'tag3');
    assert.equal(wrapper.find('AutocompleteList').prop('list')[1], 'tag4');
  });

  it('passes the text value to filter() after receiving input', () => {
    const wrapper = createComponent();
    wrapper.find('input').instance().value = 'tag3';
    typeInput(wrapper);
    assert.isTrue(fakeTagsService.filter.calledOnce);
    assert.isTrue(fakeTagsService.filter.calledWith('tag3'));
  });

  describe('suggestions open / close', () => {
    it('closes the suggestions when selecting a tag from autocomplete-list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty'; // to open list
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
      selectOption(wrapper, 'tag4');
      wrapper.update();
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
    });

    it('closes the suggestions when deleting <input> value', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('list').length, 2);
      wrapper.update();
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
      wrapper.find('input').instance().value = ''; // clear input
      wrapper
        .find('input')
        .simulate('input', { inputType: 'deleteContentBackward' });
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
    });

    it('does not close the suggestions when deleting only part of the <input> value', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('list').length, 2);
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
      wrapper.find('input').instance().value = 't'; // non-empty input remains
      wrapper
        .find('input')
        .simulate('input', { inputType: 'deleteContentBackward' });
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
    });

    it('opens the suggestions on focus if <input> is not empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
    });

    it('does not open the suggestions on focus if <input> is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
    });

    it('does not open the suggestions on focus if <input> value is only white space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = ' ';
      wrapper.find('input').simulate('focus', {});
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
    });

    it('closes the suggestions when focus is removed from the <input> field', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
      document.body.dispatchEvent(new Event('focus'));
      wrapper.update();
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
    });

    it('does not render duplicate suggestions', () => {
      // `tag3` supplied in the `tagList` will be a duplicate value relative
      // with the fakeTagsService.filter result above.
      const wrapper = createComponent({
        editMode: true,
        tagList: ['tag1', 'tag2', 'tag3'],
      });
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.deepEqual(wrapper.find('AutocompleteList').prop('list'), ['tag4']);
    });
  });

  describe('when adding tags', () => {
    /**
     * Helper function to assert that a tag was correctly added
     */
    const assertAddTagsSuccess = (wrapper, tagList) => {
      // saves the suggested tags to the service
      assert.isTrue(
        fakeTagsService.store.calledWith(tagList.map(tag => ({ text: tag })))
      );
      // called the onEditTags callback prop
      assert.isTrue(fakeOnEditTags.calledWith({ tags: tagList }));
      // hides the suggestions
      assert.equal(wrapper.find('AutocompleteList').prop('open'), false);
      // removes the selected index
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), -1);
      // assert the input value is cleared out
      assert.equal(wrapper.find('input').instance().value, '');
      // input element should have focus
      assert.equal(document.activeElement.nodeName, 'INPUT');
    };
    /**
     * Helper function to assert that a tag was correctly not added
     */
    const assertAddTagsFail = () => {
      assert.isTrue(fakeTagsService.store.notCalled);
      assert.isTrue(fakeOnEditTags.notCalled);
    };

    it('adds a tag from the <input> field', () => {
      const wrapper = createComponent();
      selectOption(wrapper, 'tag3');
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
    });

    it('adds a tag from the <input> field via keydown event', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOptionViaEnter(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      // ensure focus is still on the input field
      assert.equal(document.activeElement.nodeName, 'INPUT');
    });

    it('adds a tag from the <input> field when typing "," delimiter', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      selectOptionViaDelimiter(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      // ensure focus is still on the input field
      assert.equal(document.activeElement.nodeName, 'INPUT');
    });

    it('adds a tag when the <input> value is a match for a suggestion and "Tab" is pressed', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      typeInput(wrapper);
      // suggestions: [tag3, tag4]
      selectOptionViaTab(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      // ensure focus is still on the input field
      assert.equal(document.activeElement.nodeName, 'INPUT');
    });

    it('adds a tag from the suggestions list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // suggestions: [tag3, tag4]
      navigateDown(wrapper);
      selectOptionViaEnter(wrapper);
      assertAddTagsSuccess(wrapper, ['tag1', 'tag2', 'tag3']);
      // ensure focus is still on the input field
      assert.equal(document.activeElement.nodeName, 'INPUT');
    });

    it('should not add a tag if the <input> is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if the input is empty', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if the <input> value is only white space', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = '  ';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not add a tag if its a duplicate of one already in the list', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag1';
      selectOptionViaEnter(wrapper);
      assertAddTagsFail();
    });

    it('should not a tag when pressing "Tab" and input typed is not a suggestion', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag33';
      typeInput(wrapper);
      selectOptionViaTab(wrapper);
      assertAddTagsFail();
    });

    it('should not a tag when pressing "Tab" and no suggestions are found', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'tag3';
      // note: typeInput() opens the suggestions list
      selectOptionViaTab(wrapper);
      assertAddTagsFail();
    });
  });

  describe('when removing tags', () => {
    it('removes `tag1` when clicking its delete button', () => {
      const wrapper = createComponent(); // note: initial tagList is ['tag1', 'tag2']
      assert.equal(wrapper.find('.tag-editor__edit').length, 2);
      wrapper
        .find('button')
        .at(0) // delete 'tag1'
        .simulate('click');

      // saves the suggested tags to the service (only 'tag2' should be passed)
      assert.isTrue(fakeTagsService.store.calledWith([{ text: 'tag2' }]));
      // called the onEditTags callback prop  (only 'tag2' should be passed)
      assert.isTrue(fakeOnEditTags.calledWith({ tags: ['tag2'] }));
    });
  });

  describe('navigating suggestions via keyboard', () => {
    it('should set the initial `activeItem` value to -1 when opening suggestions', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('open'), true);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), -1);
    });
    it('should increment the `activeItem` when pressing down circularly', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // 2 suggestions: ['tag3', 'tag4'];
      navigateDown(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), 0);
      navigateDown(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), 1);
      navigateDown(wrapper);
      // back to unselected
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), -1);
    });

    it('should decrement the `activeItem` when pressing up circularly', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // 2 suggestions: ['tag3', 'tag4'];
      navigateUp(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), 1);
      navigateUp(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), 0);
      navigateUp(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), -1);
    });

    it('should set `activeItem` to -1 when clearing the suggestions', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      navigateDown(wrapper);
      // change to non-default value
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), 0);
      // clear suggestions
      wrapper.find('input').instance().value = '';
      typeInput(wrapper);
      assert.equal(wrapper.find('AutocompleteList').prop('activeItem'), -1);
    });
  });

  describe('accessibility attributes and ids', () => {
    it('creates multiple <TagEditor> components with unique autocomplete-list `id` props', () => {
      const wrapper1 = createComponent();
      const wrapper2 = createComponent();
      assert.notEqual(
        wrapper1.find('AutocompleteList').prop('id'),
        wrapper2.find('AutocompleteList').prop('id')
      );
    });

    it('sets the <AutocompleteList> `id` prop to the same value as the `aria-owns` attribute', () => {
      const wrapper = createComponent();
      wrapper.find('AutocompleteList');

      assert.equal(
        wrapper.find('.tag-editor__combobox-wrapper').prop('aria-owns'),
        wrapper.find('AutocompleteList').prop('id')
      );
    });

    it('sets `aria-expanded` value to match open state', () => {
      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty'; // to open list
      typeInput(wrapper);
      assert.equal(
        wrapper.find('.tag-editor__combobox-wrapper').prop('aria-expanded'),
        'true'
      );
      selectOption(wrapper, 'tag4');
      wrapper.update();
      assert.equal(
        wrapper.find('.tag-editor__combobox-wrapper').prop('aria-expanded'),
        'false'
      );
    });

    it('sets the <AutocompleteList> `activeItem` prop to match the selected item index', () => {
      function checkAttributes(wrapper) {
        const activeDescendant = wrapper
          .find('input')
          .prop('aria-activedescendant');
        const itemPrefixId = wrapper
          .find('AutocompleteList')
          .prop('itemPrefixId');
        const activeDescendantIndex = activeDescendant.split(itemPrefixId);
        assert.equal(
          activeDescendantIndex[1],
          wrapper.find('AutocompleteList').prop('activeItem')
        );
      }

      const wrapper = createComponent();
      wrapper.find('input').instance().value = 'non-empty';
      typeInput(wrapper);
      // initial aria-activedescendant value is "" when index is -1
      assert.equal(wrapper.find('input').prop('aria-activedescendant'), '');
      // 2 suggestions: ['tag3', 'tag4'];
      navigateDown(wrapper); // press down once
      checkAttributes(wrapper);
      navigateDown(wrapper); // press down again once
      checkAttributes(wrapper);
    });
  });

  describe('accessibility validation', () => {
    beforeEach(function () {
      // create a full dom tree for a11y testing
      $imports.$mock({
        './autocomplete-list': AutocompleteList,
      });
    });

    it(
      'should pass a11y checks',
      checkAccessibility([
        {
          name: 'suggestions open',
          content: () => {
            const wrapper = createComponent();
            wrapper.find('input').instance().value = 'non-empty';
            typeInput(wrapper);
            return wrapper;
          },
        },
        {
          name: 'suggestions open, first item selected',
          content: () => {
            const wrapper = createComponent();
            wrapper.find('input').instance().value = 'non-empty';
            typeInput(wrapper);
            navigateDown(wrapper);
            return wrapper;
          },
        },
        {
          name: 'suggestions closed',
          content: () => {
            return createComponent();
          },
        },
      ])
    );
  });
});
