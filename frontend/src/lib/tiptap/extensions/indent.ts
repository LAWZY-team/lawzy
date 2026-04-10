import { Extension } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /**
       * Increase the indent attribute
       */
      indent: () => ReturnType
      /**
       * Decrease the indent attribute
       */
      outdent: () => ReturnType
    }
  }
}

export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      minIndent: 0,
      maxIndent: 10,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => parseInt(element.getAttribute('data-indent') || '0', 10),
            renderHTML: (attributes) => {
              if (attributes.indent === 0) {
                return {}
              }

              return {
                'data-indent': attributes.indent,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const indent = (node.attrs.indent || 0) + 1
              if (indent <= this.options.maxIndent) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent,
                })
              }
            }
          })

          if (dispatch) {
            dispatch(tr)
          }

          return true
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          const { from, to } = selection

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const indent = (node.attrs.indent || 0) - 1
              if (indent >= this.options.minIndent) {
                tr = tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent,
                })
              }
            }
          })

          if (dispatch) {
            dispatch(tr)
          }

          return true
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        // If it's a list, the list extension will handle it if the cursor is at the start.
        // But the user wants it to work for regular paragraphs too.
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          // TipTap lists handle sinkListItem by default with Tab if configured.
          // We let it fall through if it's a list? 
          // Actually, let's just trigger indent and see.
          // SinkListItem is usually more specific.
          
          // Better: only use our indent for non-list items to stay compatible with list nesting.
          const { selection } = this.editor.state
          let isList = false
          this.editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
            if (node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'listItem') {
              isList = true
            }
          })
          
          if (isList) return false // let list extensions handle it
        }
        
        return this.editor.commands.indent()
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
          const { selection } = this.editor.state
          let isList = false
          this.editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
            if (node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'listItem') {
              isList = true
            }
          })
          
          if (isList) return false
        }
        return this.editor.commands.outdent()
      },
    }
  },
})
