exports.global_ui_vars = { 
    asides_panels_toggle_last_class: {},
    copy: { button: false, content: false }
};

// https://stackoverflow.com/questions/11547672/how-to-stringify-event-object/58416333#58416333
const normalize_object = (object, depth=0, max_depth=4) => {
    if (depth > max_depth) {
      return 'Object';
    }
    if (typeof object == 'string') {
      return object;
    }
    if (typeof object == 'number') {
      return `${object}`;
    }
    if ((typeof object != 'string') && (typeof object != 'number') && (typeof object != 'object')) {
      return typeof object;
    }

    const obj = {};
    for (let key in object) {
        let value = object[key];
        if (value instanceof Node)
            // specify which properties you want to see from the node
            value = {id: value.id};
        else if (value instanceof Window)
            value = 'Window';
        else if (value instanceof Object)
            value = normalize_object(value, depth+1, max_depth);

        obj[key] = value;
    }
    
    return obj;
}

exports.page_main_add = (page, text, details = '', details_as_text_node = false, background_color = false) => {
  
  try { text = typeof text == 'string' ? text : JSON.stringify(normalize_object(text, 2)) } catch (e) { }
  try { details = typeof details == 'string' ? details : JSON.stringify(normalize_object(details, 1)) } catch (e) { }
  const p_el = document.querySelector('body > div').cloneNode(deep = false);
  const text_el = document.querySelector('body > div').cloneNode(deep = false);
  const details_el = document.querySelector('body > div').cloneNode(deep = false);
  if (background_color) {
    text_el.classList.add(`background-color-${background_color}-10`);
    details_el.classList.add(`background-color-${background_color}-05`);
  }
  
  const text_textnode = document.createTextNode(text);
  text_el.appendChild(text_textnode);
  p_el.appendChild(text_el);
  if (details_as_text_node) {
    details_el.classList.add('text_node');
    details_el.appendChild(
      document.createTextNode(details)
    )
  } else {
    const details_textnode = document.createTextNode(details);
    details_el.appendChild(details_textnode);
  }
  p_el.appendChild(details_el);
  const page_el = document.querySelector(`body > main > main > main > .${page}`);
  page_el.appendChild(p_el);
}

exports.new_html_element = (tagname, content = false, classlist = [], keep_fn = false) => {
  const el = document.querySelector(`body > ${tagname}`).cloneNode(deep = false);
  el.classList.add(...classlist);
  if (content) {
    if (typeof content == 'string') {
      const content_textnode = document.createTextNode(content);
      el.appendChild(content_textnode);
    } else {
      for (let _el of content) {
        el.appendChild(_el);
      }
    }
  }
  if (typeof keep_fn == 'object') {
    require('../domething').keep_fn([el], keep_fn);
    require('../domething').cleanup_elements(el);
  }
  return el;
}

exports.notification_add = (text, icon, background_color = false) => {
  const notifications_container = document.querySelector('body > main > main > main > .notifications');
  
  const _icon_color = background_color ? background_color == 'yellow' ? 'icon-color-black' : 'icon-color-white' : 'icon-color-1';
  const notification_div_i = this.new_html_element(tagname = 'i', content = false, classlist = ['icon', icon, _icon_color], keep_fn = []);
  const notification_div_wrap_i = this.new_html_element(tagname = 'div', content = [notification_div_i], classlist = [], keep_fn = []);
  const notification_div = this.new_html_element(tagname = 'div', content = text, classlist = [], keep_fn = []);
  const notification_button_i = this.new_html_element(tagname = 'i', content = false, classlist = ['icon', 'icon-close', _icon_color], keep_fn = []);
  const notification_button_wrap_i = this.new_html_element(tagname = 'button', content = [notification_button_i], classlist = [], keep_fn = ['addEventListener']);
  if (background_color) {
    notification_div_wrap_i.classList.add(`background-color-${background_color}-10`);
    notification_div.classList.add(`background-color-${background_color}-10`);
    notification_button_wrap_i.classList.add(`background-color-${background_color}-10`);
  }
  
  notification_button_wrap_i.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation();
    if (!event.isTrusted) { return false }
    
    const notification_to_remove = document.querySelector('body > main > main > main > .notifications').firstChild;
    console.log(notification_to_remove.outerHTML, 'notification removed', details_as_text_node = true);
    notification_to_remove.remove();
  }, useCapture = false);
  
  notification_button_wrap_i._keep_fn = [];
  const notification = this.new_html_element(tagname = 'div', content = [notification_div_wrap_i, notification_div, notification_button_wrap_i], classlist = [], keep_fn = []);
  
  notifications_container.insertBefore(notification,notifications_container.firstChild);
  console.log(notification.outerHTML, 'notification added', details_as_text_node = true);
}

exports.rgb_colors_mix = (rgbA, rgbB, amountToMix) => { // https://stackoverflow.com/questions/14819058/mixing-two-colors-naturally-in-javascript/32171077#32171077
  rgbA = rgbA.split(',');
  rgbB = rgbB.split(',');
  //colorChannelA and colorChannelB are ints ranging from 0 to 255
  function colorChannelMixer(colorChannelA, colorChannelB, amountToMix){
      var channelA = colorChannelA*amountToMix;
      var channelB = colorChannelB*(1-amountToMix);
      return parseInt(channelA+channelB);
  }
  //rgbA and rgbB are arrays, amountToMix ranges from 0.0 to 1.0
  //example (red): rgbA = [255,0,0]
  var r = colorChannelMixer(rgbA[0],rgbB[0],amountToMix);
  var g = colorChannelMixer(rgbA[1],rgbB[1],amountToMix);
  var b = colorChannelMixer(rgbA[2],rgbB[2],amountToMix);
  
  return `rgb(${r},${g},${b})`;
}

/*
let list = [4, 5, 6];
for (let i in list) { // "0", "1", "2",
for (let i of list) { // 4, 5, 6
*/

const _state = {
  done: {
    _document_asides_panels_toggle: false,
    _document_bind_vertical_as_horizontal: false,
    _document_init_scroll_right: false,
    _document_theme_toggle: false,
    _document_media_queries: false,
    _document_set_mixed_colors: false,
    _document_set_subfooter_textarea: false
  }
};
exports.get_state = () => { return _state; }

exports.init = () => {
    
    // used to display on DEV but not on PROD: (console is removed by webpack)
    if (require('../body').IS_FOOSTACK_DEV) {
        this.notification_add('Running foostack as dev mode', 'icon-slash-square', background_color = 'yellow');
        window.console = { // !! AFTER: _document_set_body_pages()
            _is_custom: true,
            debug: (obj, text = '_text', details_as_text_node = false, background_color = false) => {
                this.page_main_add('_console', `console.debug: ${text}`, obj, details_as_text_node, background_color);
            },
            log: (obj, text = '_text', details_as_text_node = false, background_color = false) => {
                this.page_main_add('_console', `console.log: ${text}`, obj, details_as_text_node, background_color);
            }
        }
    }
    
    if (!window.Worker) {
      console.log('No window.Worker available ! UI can lag', 'window.Worker', details_as_text_node = false, background_color = 'orange');
    } else {
      console.log('window.Worker available', 'window.Worker', details_as_text_node = false, background_color = 'green');
    }
    
    
    _document_asides_panels_toggle();
    _document_bind_vertical_as_horizontal();
    _document_init_scroll_right();
    _document_theme_toggle();
    _document_media_queries();
    _document_set_mixed_colors();
    _document_set_subfooter_textarea();
    
    document.querySelector('body > main > main > footer > nav > section > button').addEventListener('click', (event) => {
      const _textarea_el = document.querySelector('body > main > main > footer > nav > section > textarea');
      // data: { origin: 'ui_footer_input_send', data: _data, path: window.location.pathname }
      require('../body.js').postMessage_socketio({ origin: 'ui_footer_input_send', data: _textarea_el.value });
      if ((window.location.pathname != '') && (window.location.pathname != '/')) {
        this.page_main_add(window.location.pathname.replace('/','_'), 'text input', _textarea_el.value)
      }
      _textarea_el.value = '';
    });
    
    
  
    /*
    const gen_login_auto_user_openpgpcreds = async () => {
      _openpgpcreds = await require('../../../common/crypto').openpgp.generate('user', 'user@test.local', armored = true);
      console.log(_openpgpcreds.pub);
    }
    gen_login_auto_user_openpgpcreds();
    */
    // not as expected on firefox mobile when focusing textarea
    //window.addEventListener('resize', function(event) {
      //console.log(window.screen.height, 'window.screen.height');
      //console.log(window.outerHeight, 'window.outerHeight');
      //console.log(window.innerHeight, 'window.innerHeight');
      //console.log(document.body.clientHeight, 'document.body.clientHeight');
    //});
    
    //_document_bind_vertical_as_horizontal(['body > main > aside > header > nav']);

    const stateCheck_body_ui_init_ = window.setInterval(() => {
      if (_state.done._document_asides_panels_toggle && _state.done._document_bind_vertical_as_horizontal && _state.done._document_init_scroll_right && _state.done._document_theme_toggle && _state.done._document_media_queries && _state.done._document_set_mixed_colors && _state.done._document_set_subfooter_textarea) {
        window.clearInterval(stateCheck_body_ui_init_);
        _state.done = true ;
      }
    }, 10);
    
}


const _document_set_subfooter_textarea = () => {
    const _footer_el = document.querySelector('body > main > main > footer');
    const _textarea_el = document.querySelector('body > main > main > footer > nav > section > textarea');
    
    // add stick-bottom class to subfooter => making changes only at media (max-width: 720px)
    _textarea_el.addEventListener('focus', (event) => {
      event.preventDefault(); event.stopPropagation();
      //if (!event.isTrusted) { return false } // 
      _footer_el.classList.add('stick-bottom');
    }, useCapture = false);
    _textarea_el.addEventListener('focusout', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!event.isTrusted) { return false }
      _footer_el.classList.remove('stick-bottom');
    }, useCapture = false);
    
    // focus textarea when you click outside (on section)
    document.querySelector('body > main > main > footer > nav > section:not(:first-child):not(:last-child)').addEventListener('click', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!event.isTrusted) { return false }
      _textarea_el.focus();
    }, useCapture = false);
    
    // give dynamic size of textarea https://stackoverflow.com/questions/17772260/textarea-auto-height/24676492#24676492
    const default_text_size_css_var = window.getComputedStyle(document.documentElement).getPropertyValue('--default-text-size');
    _textarea_el.addEventListener('input', (event) => {
      event.preventDefault(); event.stopPropagation();
      if (!event.isTrusted) { return false }
      event.currentTarget.style.height = default_text_size_css_var;
      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
    }, useCapture = false);
    
    _state.done._document_set_subfooter_textarea = true ;
}


const _document_set_mixed_colors = () => {
  // https://stackoverflow.com/questions/41725725/access-css-variable-from-javascript/41725782#41725782
  const html_computed_style = window.getComputedStyle(document.documentElement);
  const user_background_css_var = html_computed_style.getPropertyValue('--user-background');
  const background_rgb_css_var = html_computed_style.getPropertyValue('--background-rgb');
  for (let el of ['header', 'main', 'footer']) {
    const mixed_color = this.rgb_colors_mix(user_background_css_var, background_rgb_css_var, el == 'main' ? 0.3 : 0.2);
    document.querySelector(`body > ${el} > aside.left`).style.background = mixed_color;
    document.querySelector(`body > ${el} > aside.right`).style.background = mixed_color;
  }
  document.querySelector('body > main > main > footer').style.background = this.rgb_colors_mix(user_background_css_var, background_rgb_css_var, 0.3);
  
  _state.done._document_set_mixed_colors = true ;
}


const _document_media_queries = () => { // // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Testing_media_queries https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.remove('theme-light');
    }
    const mql_maxwidth_720 = window.matchMedia("(max-width: 720px)");
    const mql_maxwidth_1024 = window.matchMedia("(max-width: 1024px)");
    
    const _handle_mql_change = (mql) => {
        if (mql.preventDefault) { // it's an event
          mql.preventDefault(); mql.stopPropagation();
          if (!mql.isTrusted) { return false }
        }
        // using mql-max-width- body class to avoid using resize event
        if (mql.media.includes("720")) {
            if (!mql.matches) {
                document.body.classList.remove("mql-max-width-720");
                console.log(document.body.classList.value, 'mql 720 DOESNT matches, body classList:');
                
                document.body.classList.add("left-panel-mini-open", "right-panel-mini-open");
            } else {
                document.body.classList.add("mql-max-width-720");
                console.log(document.body.classList.value, 'mql 720 matches, body classList:');
                
                document.body.classList.remove("left-panel-mini-open", "right-panel-mini-open");
                document.querySelector(`body > header > aside.left > .left-panel-open-toggle > i`).classList.replace("icon-push-chevron-left-square", "icon-push-chevron-right-square");
                document.querySelector(`body > header > aside.right > .right-panel-open-toggle > i`).classList.replace("icon-push-chevron-right-square", "icon-push-chevron-left-square");
            }
        }
        if (mql.media.includes("1024")) {
            if (!mql.matches) {
                document.body.classList.remove("mql-max-width-1024");
                console.log(document.body.classList.value, 'mql 1024 DOESNT matches, body classList:');
                
                document.body.classList.add("left-panel-open", "right-panel-open");
                document.querySelector(`body > header > aside.left > .left-panel-open-toggle > i`).classList.replace("icon-push-chevron-right-square", "icon-push-chevron-left-square");
                document.querySelector(`body > header > aside.right > .right-panel-open-toggle > i`).classList.replace("icon-push-chevron-left-square", "icon-push-chevron-right-square");
            } else {
                document.body.classList.add("mql-max-width-1024");
                console.log(document.body.classList.value, 'mql 1024 matches, body classList:');
                
                document.body.classList.remove("left-panel-open", "right-panel-open");
            }
        }
    }
    _handle_mql_change(mql_maxwidth_720);
    _handle_mql_change(mql_maxwidth_1024);
    mql_maxwidth_720.addEventListener("change", _handle_mql_change, useCapture = false);
    mql_maxwidth_1024.addEventListener("change", _handle_mql_change, useCapture = false);
    
    _state.done._document_media_queries = true ;
}


const _document_theme_toggle = () => {
    document.querySelector("body > footer > aside.left > button > i").addEventListener("click", (event) => {
        event.preventDefault(); event.stopPropagation();
        if (!event.isTrusted) { return false }
        if (document.documentElement.classList.contains("theme-light")) {
            document.documentElement.classList.remove("theme-light");
        } else {
            document.documentElement.classList.add("theme-light");

            if(window.matchMedia('(prefers-color-scheme: dark)').matches){
              this.notification_add('Browser settings have (prefers-color-scheme: dark) which can break light theme!', 'icon-stack-right');
            }
        }
        
        _document_set_mixed_colors();
    }, useCapture = false);
    
    _state.done._document_theme_toggle = true ;
}


const _document_init_scroll_right = (elements_array) => {
    const _init_scroll_right_elements = elements_array ? elements_array : [
        "body > header > aside.right > nav",
        "body > header > main > nav > section:last-child",
        "body > footer > aside.right > nav",
        "body > footer > main > nav",
        "body > footer > main > nav > section:last-child",
        "body > main > aside.right > header > nav",
        "body > main > aside.right > footer > nav",
        "body > main > main > header > nav > section:last-child",
        "body > main > main > footer > nav > section:last-child",
    ];
    for (const element of document.querySelectorAll(_init_scroll_right_elements.join(","))) {
        element.scrollLeft = element.scrollWidth - element.clientWidth;
    }
    
    _state.done._document_init_scroll_right = true ;
}


const _document_asides_panels_toggle = () => {
    for (const pos of ["left", "right"]) {
        this.global_ui_vars.asides_panels_toggle_last_class[pos] = "";
        document.querySelector(`body > header > aside.${pos} > .${pos}-panel-open-toggle > i`).addEventListener("click", (event) => {
            event.preventDefault(); event.stopPropagation();
            if (!event.isTrusted) { return false }
            if (document.body.classList.contains(`${pos}-panel-mini-open`) && document.body.classList.contains(`${pos}-panel-open`)) {
                document.body.classList.remove(`${pos}-panel-open`);
                require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] = `${pos}-panel-open`;
            } else if (document.body.classList.contains(`${pos}-panel-mini-open`)) {
                if (require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] == `${pos}-panel-open`) { // from full to none direction
                    document.body.classList.remove(`${pos}-panel-mini-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "left" : "right"}-square`, `icon-push-chevron-${pos == "left" ? "right" : "left"}-square`);
                } else { // from none to full direction
                    document.body.classList.add(`${pos}-panel-open`);
                    event.target.classList.replace(`icon-push-chevron-${pos == "left" ? "right" : "left"}-square`, `icon-push-chevron-${pos == "left" ? "left" : "right"}-square`);
                    for (let el of ['header', 'main', 'footer']) {
                      document.querySelector(`body > ${el} > aside.${pos}`).style.zIndex = el == 'main' ? 103 : 104;
                      document.querySelector(`body > ${el} > aside.${pos == "left" ? "right" : "left"}`).style.zIndex = el == 'main' ? 101 : 102;
                    }
                }
            } else {
                document.body.classList.add(`${pos}-panel-mini-open`);
                require('./ui').global_ui_vars.asides_panels_toggle_last_class[pos] = "";
            }
        }, useCapture = false);
    }
    
    _state.done._document_asides_panels_toggle = true ;
}


// .scroll-vertical-as-horizontal
const _document_bind_vertical_as_horizontal = (elements_array) => {
    
    const _horizontal_scrollable_nav = elements_array ? elements_array : [
        "body > header > aside > nav",
        "body > header > main > nav",
        "body > header > main > nav > section",
        "body > footer > aside > nav",
        "body > footer > main > nav",
        "body > footer > main > nav > section",
        "body > main > aside > header > nav",
        "body > main > aside > footer > nav",
        "body > main > main > header > nav",
        "body > main > main > header > nav > section",
        "body > main > main > footer > nav",
        "body > main > main > footer > nav > section",
        ".scroll-vertical-as-horizontal"
    ];
    const _bind_vertical_as_horizontal = (event) => { // https://stackoverflow.com/a/59680347
        event.preventDefault(); event.stopPropagation();
        if (!event.isTrusted) { return false }
        if (!event.deltaY) { return; }
        event.currentTarget.scrollLeft += event.deltaY + event.deltaX;
    };
    for (const element of document.querySelectorAll(_horizontal_scrollable_nav.join(","))) {
        //element.removeEventListener('wheel', _bind_vertical_as_horizontal); // if it's a re-call
        element.addEventListener('wheel', _bind_vertical_as_horizontal, useCapture = false);
    }
    
    _state.done._document_bind_vertical_as_horizontal = true ;
}
