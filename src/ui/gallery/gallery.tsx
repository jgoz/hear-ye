import * as React from 'react';

import { Normalize } from '@smooth-ui/core-sc';

import { SideBar } from '../side-bar/side-bar';
import { ExampleSummary } from '../example-summary/example-summary';
import { ErrorOverlay } from '../error-overlay/error-overlay';

const socket = require('webpack-dev-server/client/socket.js');
const ansiRegex = require('ansi-regex/index.js')();

import './gallery.scss';

interface ProjectInfo {
  name: string;
  version: string;
  description: string;
  keywords: string[];
}

interface ProjectOptions {
  strict: boolean;
}

export type Example = {
  label: string;
  path?: string[];
  examples?: Example[];
  component?: JSX.Element;
}

interface GalleryState {
  errors?: string[];
  exampleId?: string;
}

export class Gallery extends React.Component<{}, GalleryState> {
  static projectInfo: ProjectInfo;
  static options: ProjectOptions;

  static examples: Example[] = [];

  static add(example: {component: JSX.Element; path: string[]}) {
    const { path } = example;

    const p = path.map(p => p.replace(/\/+/, ' '));

    let examples = Gallery.examples;
    let _p = p.shift();
    while (_p && p.length >= 0) {
      const found = examples.find(e => e.label === _p);
      if (found) {
        examples = found.examples;
      } else {

        if (p.length === 0) {
          examples.push({
            label: _p,
            path,
            component: example.component
          });
          break;

        } else {
          examples.push({
            label: _p,
            examples: [] as Example[]
          });

          examples = examples[examples.length - 1].examples;
        }
      }

      _p = p.shift();
    }
  }

  private mounted: boolean;

  constructor(props: {}, context: any) {
    super(props, context);
    this.state = {};

    this.setTitle();
  }

  setTitle = () => {
    const { exampleId } = this.state;

    const example = exampleId ? this.getExampleForId(exampleId) : null;

    const projectNameBits = Gallery.projectInfo.name.split('/');

    const titleBits = [
      projectNameBits[projectNameBits.length - 1] + '@' + Gallery.projectInfo.version,
      example ? example.label : null
    ];

    window.document.title = titleBits.filter(Boolean).join(' | ');
  }

  componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.onHashChange);
    this.onHashChange();

    socket('http://localhost:1234/sockjs-node', {
      errors: (_errors: string[]) => {
        if (!this.mounted) return;
        this.setState({
          errors: _errors.map(str => str.replace(ansiRegex, ''))
        });
      },
      ok: () => {
        if (!this.mounted) return;
        this.setState({
          errors: null
        });
      },
      close: () => {}
    });
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
    this.mounted = false;
  }

  onHashChange = () => {
    const hash = window.location.hash.replace(/^#/, '');
    this.setState({
      exampleId: hash
    }, this.setTitle);
  }

  selectItem = (item: Example) => {
    const url = item.path.map(encodeURI).join('/');

    window.location.hash = url;
  }

  getExampleForId(id: string): Example {
    if (!id) return null;

    const path = id.split('/').map(decodeURI);

    let examples = Gallery.examples;
    let p = path.shift();

    while(p && path.length >= 0) {
      const example = examples.find(e => e.label === p)
      if (path.length === 0) return example;
      examples = example.examples;
      p = path.shift();
    }

    return null;
  }

  renderMain() {
    const { exampleId } = this.state;

    if (!exampleId) {
      const { name, description, keywords, version } = Gallery.projectInfo;
      return <div className="main nothing-to-show">
        <div className="vertically-centered">
          <div className="name">{name}@{version}</div>
          <div className="description">{description}</div>
          <div className="keywords">{keywords.map((k, i) => <span key={i} className="keyword">{k}</span>)}</div>
        </div>
      </div>;
    }

    const example = exampleId ? this.getExampleForId(exampleId) : null;

    if (!example) {
      return <div className="main">
        404, I guess?
      </div>;
    }

    return <div className="main">
      <ExampleSummary example={example}/>
      {example.component}
    </div>;
  }

  render() {
    const { errors, exampleId } = this.state;

    const examples = Gallery.examples;

    const content = <div className="hy-gallery">
      <SideBar
        examples={examples}
        onClick={this.selectItem}
        selectedExample={this.getExampleForId(exampleId)}
      />

      { this.renderMain() }
      {
        errors
        ? <ErrorOverlay errors={errors}/>
        : null
      }
    </div>;

    if (!Gallery.options.strict) return content;

    return <React.StrictMode>
      {content}
    </React.StrictMode>;
  }
}
