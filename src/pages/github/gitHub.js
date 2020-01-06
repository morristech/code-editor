import tag from 'html-tag-js';
import mustache from 'mustache';
import helpers from '../../modules/helpers';
import GithubLogin from '../login/login';
import Page from '../../components/page';

import _template from './gitHub.hbs';
import _menu from './menu.hbs';
import './gitHub.scss';
import Repo from '../repo/repo';
import contextMenu from '../../components/contextMenu';
import fs from '../../modules/utils/androidFileSystem';
import dialogs from '../../components/dialogs';
import git from '../../modules/git';

/**
 * 
 * @param {object} options 
 * @param {import('../../components/page').PageObj} options.$loginPage 
 */
function gitHub(options = {}) {
  const $search = tag('span', {
    className: 'icon search hidden'
  });
  const $menuToggler = tag('span', {
    className: 'icon more_vert'
  });
  const $page = Page('Github');
  const {
    credentials
  } = helpers;
  /**
   * @type {Array<object>}
   */
  let repos = null;
  const github = git.GitHub();
  const user = github.getUser();
  const githubFile = cordova.file.externalDataDirectory + '.github';
  const $cm = contextMenu(mustache.render(_menu, strings), {
    top: '8px',
    right: '8px',
    toggle: $menuToggler,
    transformOrigin: 'top right'
  });

  $cm.addEventListener('click', handleClick);
  $page.querySelector('header').append($search, $menuToggler);

  fs.readFile(githubFile)
    .then(res => {
      const decoder = new TextDecoder('utf-8');
      const text = credentials.decrypt(decoder.decode(res.data));
      const repos = JSON.parse(text);
      render(repos);
    })
    .catch(err => {
      console.log('While reading .github file', err);
      if (!options.$loginPage)
        dialogs.loaderShow('GitHub', strings.loading + '...');
      loadRepos();
    });

  /**
   * 
   * @param {Array<object>} repos 
   */
  function render(res) {
    repos = res;

    repos.map(repo => {
      const {
        language,
        size,
        updated_at
      } = repo;

      repo.size = (size / 1024).toFixed(2) + 'KB'
      repo.updated_at = new Date(updated_at).toLocaleDateString();
      repo.language = `file_type_${(language || 'text').toLowerCase()}`;
    });
    const $content = tag.parse(mustache.render(_template, repos));

    $content.addEventListener('click', handleClick);

    $page.append($content);
    document.body.appendChild($page);

    actionStack.push({
      id: 'github',
      action: $page.hide
    });
    $page.onhide = function () {
      actionStack.remove('github');
    }
  }

  /**
   * 
   * @param {MouseEvent} e 
   */
  function handleClick(e) {
    /**
     * @type {HTMLElement}
     */
    const $el = e.target;
    const action = $el.getAttribute('action');

    if (action !== 'repo') $cm.hide();
    switch (action) {
      case 'repo':
        const name = $el.getAttribute('name');
        const owner = $el.getAttribute('owner');
        Repo(owner, name, $page);
        break;
      case 'logout':
        if (localStorage.username) delete localStorage.username;
        if (localStorage.password) delete localStorage.password;
        if (localStorage.token) delete localStorage.token;
        fs.deleteFile(githubFile)
          .then(() => {
            plugins.toast.showShortBottom(strings.success);
            $page.hide();
          });
        break;
      case 'my profile':
        break;
      case 'reload':
        $page.querySelector('#github').remove();
        dialogs.loaderShow('GitHub', strings.loading + '...');
        loadRepos();
        break;
    }
  }

  function loadRepos() {
    user.listRepos()
      .then(res => {
        if (options.$loginPage)
          options.$loginPage.hide();

        const repos = res.data;
        const data = credentials.encrypt(JSON.stringify(repos));
        fs.writeFile(githubFile, data, true, false)
          .catch(err => {
            plugins.toast.showShortBottom(strings.error);
            console.log(err);
          });

        render(repos);
      })
      .catch(err => {
        if (err.response) {
          console.log(err.response.data.message);
          if (options.$loginPage) {
            options.$loginPage.setMessage(err.response.data.message);
          } else {
            GithubLogin();
          }
        } else {
          console.log(err);
        }
      })
      .finally(() => {
        dialogs.loaderHide();
      });
  }
}

export default gitHub;