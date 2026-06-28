// here navigo as client web router
import navigo from 'navigo'; // Common JS to module ES ? not important
import { page_main_add } from './ui';

//dont use this for exported vars functions like requirejs, use directly the name of the var or the function
export const router = new navigo("/");

const display_page = (page_class) => {
  const pages = document.querySelectorAll('body > main > main > main > .page');
  for (let page of pages) {
    if (page.classList.contains(page_class)) {
      page.classList.remove('displaynone');
    } else {
      page.classList.add('displaynone');
    }
  }
}

const display_page_reset = () => {
  document.querySelector('body > footer > aside.right > button.connection').classList.remove('active');
  document.querySelector('body > footer > main > nav > section > button.console').classList.remove('active');
  document.querySelector('body > footer > main > nav > section > button.console > i').classList.remove('active');
  document.querySelector('body > main > main > footer > nav > section > i').classList.remove('icon-home', 'icon-terminal-square', 'icon-arrow-exchange-horizontal');
}


const _state = { done: false };
export function get_state() { return _state; }

export function init() {
  router
        .on("/console", (params) => {renderLogConsole(params)})
        .on("/connection", (params) => {renderLogConnection(params)})
        .on("/something", (params) => {renderSomethingPage(params)})
        .on("/something/:else", (params) => {renderSomethingPage(params)})
        .on("*", (params) => {renderHomePage(params)})
        .resolve();
        
    const new_listener = (node, dest_string) => {
      node.addEventListener('click', (event) => {
        event.preventDefault();
        //event.stopPropagation();
        if (!event.isTrusted) { return false }
        const page = document.querySelector(`body > main > main > main > ._${dest_string}`);
        if (page.classList.contains('displaynone')) {
          router.navigate(`/${dest_string}`);
        } else {
          router.navigate("/");
        }
      }, useCapture = false);
    }
    new_listener(document.querySelector('body > footer > main > nav > section > button.console'), 'console');
    new_listener(document.querySelector('body > footer > aside.right > button.connection'), 'connection');
    
    // if Window.prototype.dispatchEvent is nulled (maybe)
    //Navigo doc: If there is a `popstate` event dispatched (this happens when the user manually changes the browser location by hitting for example the back button)
    // map router.resolve to window because window.addEventListener is nulled here
    window.router_resolve = router.resolve;
    _state.done = true ;
}

const renderLogConsole = (params) => {
  console.debug(params, 'navigo router params');
  display_page_reset();
  document.querySelector('body > footer > main > nav > section > button.console').classList.add('active');
  document.querySelector('body > footer > main > nav > section > button.console > i').classList.add('active');
  document.querySelector('body > main > main > footer > nav > section > textarea').placeholder = 'input console';
  document.querySelector('body > main > main > footer > nav > section > i').classList.add('icon-terminal-square');
  display_page('_console');
}
const renderLogConnection = (params) => {
  console.debug(params, 'navigo router params');
  display_page_reset();
  document.querySelector('body > footer > aside.right > button.connection').classList.add('active');
  document.querySelector('body > main > main > footer > nav > section > textarea').placeholder = 'input connection';
  document.querySelector('body > main > main > footer > nav > section > i').classList.add('icon-arrow-exchange-horizontal');
  display_page('_connection');
}
const renderHomePage = (params) => {
  console.debug(params, 'navigo router params');
  display_page_reset();
  document.querySelector('body > main > main > footer > nav > section > textarea').placeholder = 'input home';
  document.querySelector('body > main > main > footer > nav > section > i').classList.add('icon-home');
  display_page('_main');
}

const renderSomethingPage = (params) => {
    
}
