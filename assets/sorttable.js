/* eslint-disable no-param-reassign */
/* eslint-disable func-names */
/* eslint-disable no-use-before-define */

/*
  Based on SortTable
  Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/
*/

const sorttable = {
  init() {
    sorttable.DATE_RE = /^(\d\d?)[/.-](\d\d?)[/.-]((\d\d)?\d\d)$/;
  },

  makeSortable(table) {
    if (table.getElementsByTagName('thead').length === 0) {
      const the = document.createElement('thead');
      the.appendChild(table.rows[0]);
      table.insertBefore(the, table.firstChild);
    }
    if (table.tHead === null) table.tHead = table.getElementsByTagName('thead')[0];
    if (table.tHead.rows.length !== 1) return; // can't cope with two header rows
    const sortbottomrows = [];
    for (let i = 0; i < table.rows.length; i++) {
      if (table.rows[i].className.search(/\bsortbottom\b/) !== -1) {
        sortbottomrows[sortbottomrows.length] = table.rows[i];
      }
    }
    if (sortbottomrows) {
      let tfo;
      if (table.tFoot == null) {
        tfo = document.createElement('tfoot');
        table.appendChild(tfo);
      }
      for (let i = 0; i < sortbottomrows.length; i++) {
        tfo.appendChild(sortbottomrows[i]);
      }
    }

    const headrow = table.tHead.rows[0].cells;
    for (let i = 0; i < headrow.length; i++) {
      if (!headrow[i].className.match(/\bsorttable_nosort\b/)) { // skip this col
        const mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
        let override;
        if (mtch) { override = mtch[1]; }
        if (mtch && typeof sorttable[`sort_${override}`] === 'function') {
          headrow[i].sorttable_sortfunction = sorttable[`sort_${override}`];
        } else {
          headrow[i].sorttable_sortfunction = sorttable.guessType(table, i);
        }
        headrow[i].sorttable_columnindex = i;
        headrow[i].sorttable_tbody = table.tBodies[0];
        dean_addEvent(headrow[i], 'click', sorttable.innerSortFunction = function () {
          if (this.className.search(/\bsorttable_sorted\b/) !== -1) {
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted', 'sorttable_sorted_reverse');
            this.removeChild(document.getElementById('sorttable_sortfwdind'));
            const sortrevind = document.createElement('span');
            sortrevind.id = 'sorttable_sortrevind';
            sortrevind.innerHTML = '&nbsp;&#x25B4;';
            this.appendChild(sortrevind);
            return;
          }
          if (this.className.search(/\bsorttable_sorted_reverse\b/) !== -1) {
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted_reverse',
              'sorttable_sorted');
            this.removeChild(document.getElementById('sorttable_sortrevind'));
            const sortfwdind = document.createElement('span');
            sortfwdind.id = 'sorttable_sortfwdind';
            sortfwdind.innerHTML = '&nbsp;&#x25BE;';
            this.appendChild(sortfwdind);
            return;
          }

          const theadrow = this.parentNode;
          forEach(theadrow.childNodes, (cell) => {
            if (cell.nodeType === 1) { // an element
              cell.className = cell.className.replace('sorttable_sorted_reverse', '');
              cell.className = cell.className.replace('sorttable_sorted', '');
            }
          });
          let sortfwdind = document.getElementById('sorttable_sortfwdind');
          if (sortfwdind) { sortfwdind.parentNode.removeChild(sortfwdind); }
          const sortrevind = document.getElementById('sorttable_sortrevind');
          if (sortrevind) { sortrevind.parentNode.removeChild(sortrevind); }

          this.className += ' sorttable_sorted';
          sortfwdind = document.createElement('span');
          sortfwdind.id = 'sorttable_sortfwdind';
          sortfwdind.innerHTML = '&nbsp;&#x25BE;';
          this.appendChild(sortfwdind);

          const row_array = [];
          const col = this.sorttable_columnindex;
          const rows = this.sorttable_tbody.rows;
          for (let j = 0; j < rows.length; j++) {
            row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
          }
          row_array.sort(this.sorttable_sortfunction);
          row_array.reverse();
          const tb = this.sorttable_tbody;
          for (let j = 0; j < row_array.length; j++) {
            tb.appendChild(row_array[j][1]);
          }
        });
      }
    }
  },

  guessType(table, column) {
    let sortfn = sorttable.sort_alpha;
    for (let i = 0; i < table.tBodies[0].rows.length; i++) {
      const text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
      if (text !== '') {
        if (text.match(/^-?[�$�]?[\d,.]+%?$/)) {
          return sorttable.sort_numeric;
        }
        const possdate = text.match(sorttable.DATE_RE);
        if (possdate) {
          const first = parseInt(possdate[1], 10);
          const second = parseInt(possdate[2], 10);
          if (first > 12) {
            return sorttable.sort_ddmm;
          } if (second > 12) {
            return sorttable.sort_mmdd;
          }
          sortfn = sorttable.sort_ddmm;
        }
      }
    }
    return sortfn;
  },

  getInnerText(node) {
    if (!node) return '';
    const hasInputs = (typeof node.getElementsByTagName === 'function')
                 && node.getElementsByTagName('input').length;
    if (node.getAttribute('sorttable_customkey') != null) {
      return node.getAttribute('sorttable_customkey');
    }
    if (typeof node.textContent !== 'undefined' && !hasInputs) {
      return node.textContent.replace(/^\s+|\s+$/g, '');
    }
    if (typeof node.innerText !== 'undefined' && !hasInputs) {
      return node.innerText.replace(/^\s+|\s+$/g, '');
    }
    if (typeof node.text !== 'undefined' && !hasInputs) {
      return node.text.replace(/^\s+|\s+$/g, '');
    }
    switch (node.nodeType) {
      case 3:
        if (node.nodeName.toLowerCase() === 'input') {
          return node.value.replace(/^\s+|\s+$/g, '');
        }
        break;
      case 4:
        return node.nodeValue.replace(/^\s+|\s+$/g, '');
      case 1:
      case 11:
        // eslint-disable-next-line no-case-declarations
        let innerText = '';
        for (let i = 0; i < node.childNodes.length; i++) {
          innerText += sorttable.getInnerText(node.childNodes[i]);
        }
        return innerText.replace(/^\s+|\s+$/g, '');
      default:
        return '';
    }
    return '';
  },

  reverse(tbody) {
    const newrows = [];
    for (let i = 0; i < tbody.rows.length; i++) {
      newrows[newrows.length] = tbody.rows[i];
    }
    for (let i = newrows.length - 1; i >= 0; i--) {
      tbody.appendChild(newrows[i]);
    }
  },

  sort_numeric(a, b) {
    let aa = parseFloat(a[0].replace(/[^0-9.-]/g, ''));
    if (isNaN(aa)) aa = 0;
    let bb = parseFloat(b[0].replace(/[^0-9.-]/g, ''));
    if (isNaN(bb)) bb = 0;
    return aa - bb;
  },
  sort_alpha(a, b) {
    if (a[0] === b[0]) return 0;
    if (a[0] < b[0]) return -1;
    return 1;
  },
  sort_ddmm(a, b) {
    let mtch = a[0].match(sorttable.DATE_RE);
    let y = mtch[3];
    let m = mtch[2];
    let d = mtch[1];
    if (m.length === 1) m = `0${m}`;
    if (d.length === 1) d = `0${d}`;
    const dt1 = y + m + d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3];
    m = mtch[2];
    d = mtch[1];
    if (m.length === 1) m = `0${m}`;
    if (d.length === 1) d = `0${d}`;
    const dt2 = y + m + d;
    if (dt1 === dt2) return 0;
    if (dt1 < dt2) return -1;
    return 1;
  },
  sort_mmdd(a, b) {
    let mtch = a[0].match(sorttable.DATE_RE);
    let y = mtch[3];
    let d = mtch[2];
    let m = mtch[1];
    if (m.length === 1) m = `0${m}`;
    if (d.length === 1) d = `0${d}`;
    const dt1 = y + m + d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3];
    d = mtch[2]; m = mtch[1];
    if (m.length === 1) m = `0${m}`;
    if (d.length === 1) d = `0${d}`;
    const dt2 = y + m + d;
    if (dt1 === dt2) return 0;
    if (dt1 < dt2) return -1;
    return 1;
  },

  shaker_sort(list, comp_func) {
    let b = 0;
    let t = list.length - 1;
    let swap = true;
    while (swap) {
      swap = false;
      for (let i = b; i < t; ++i) {
        if (comp_func(list[i], list[i + 1]) > 0) {
          const q = list[i]; list[i] = list[i + 1]; list[i + 1] = q;
          swap = true;
        }
      } // for
      t--;
      if (!swap) break;
      for (let i = t; i > b; --i) {
        if (comp_func(list[i], list[i - 1]) < 0) {
          const q = list[i]; list[i] = list[i - 1]; list[i - 1] = q;
          swap = true;
        }
      } // for
      b++;
    } // while(swap)
  },
};

window.onload = sorttable.init;

function dean_addEvent(element, type, handler) {
  if (element.addEventListener) {
    element.addEventListener(type, handler, false);
  } else {
    if (!handler.$$guid) handler.$$guid = dean_addEvent.guid++;
    if (!element.events) element.events = {};
    let handlers = element.events[type];
    if (!handlers) {
      handlers = {};
      element.events[type] = {};
      if (element[`on${type}`]) {
        handlers[0] = element[`on${type}`];
      }
    }
    handlers[handler.$$guid] = handler;
    element[`on${type}`] = handleEvent;
  }
}
dean_addEvent.guid = 1;

function handleEvent(event) {
  let returnValue = true;
  event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
  const handlers = this.events[event.type];
  for (const i in handlers) {
    this.$$handleEvent = handlers[i];
    if (this.$$handleEvent(event) === false) {
      returnValue = false;
    }
  }
  return returnValue;
}

function fixEvent(event) {
  event.preventDefault = fixEvent.preventDefault;
  event.stopPropagation = fixEvent.stopPropagation;
  return event;
}
fixEvent.preventDefault = function () {
  this.returnValue = false;
};
fixEvent.stopPropagation = function () {
  this.cancelBubble = true;
};

if (!Array.forEach) { // mozilla already supports this
  Array.forEach = function (array, block, context) {
    for (let i = 0; i < array.length; i++) {
      block.call(context, array[i], i, array);
    }
  };
}

// eslint-disable-next-line no-extend-native
Function.prototype.forEach = function (object, block, context) {
  for (const key in object) {
    if (typeof this.prototype[key] === 'undefined') {
      block.call(context, object[key], key, object);
    }
  }
};

String.forEach = function (string, block, context) {
  Array.forEach(string.split(''), (chr, index) => {
    block.call(context, chr, index, string);
  });
};

const forEach = function (object, block, context) {
  if (object) {
    let resolve = Object; // default
    if (object instanceof Function) {
      resolve = Function;
    } else if (object.forEach instanceof Function) {
      object.forEach(block, context);
      return;
    } else if (typeof object === 'string') {
      resolve = String;
    } else if (typeof object.length === 'number') {
      resolve = Array;
    }
    resolve.forEach(object, block, context);
  }
};
