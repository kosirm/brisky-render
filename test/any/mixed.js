const { render } = require('../../')
const test = require('tape')
const parse = require('parse-element')
const { create: s } = require('brisky-struct')
const strip = require('strip-formatting')

test('any - mixed', t => {
  const state = s({
    field: {
      collection: {
        0: {
          title: '0'
        }
      }
    }
  })

  const app = render({
    main: {
      holder1: {
        tag: 'holder',
        $: 'field.collection.$any',
        props: {
          default: {
            type: 'text',
            $: 'title'
          }
        }
      },
      holder2: {
        tag: 'holder2',
        $: 'field.collection.0',
        title: {
          text: { $: 'title' }
        }
      },
      holder3: {
        $: 'field',
        tag: 'holder3',
        collection: {
          tag: 'collection',
          $: 'collection.$any',
          props: {
            default: {
              type: 'text',
              $: 'title'
            }
          }
        }
      }
    }
  }, state)

  t.equal(
    parse(app),
    strip(`
      <div>
        <div>
          <holder>0</holder>
          <holder2>
            <div>0</div>
          </holder2>
          <holder3>
            <collection>0</collection>
          </holder3>
        </div>
      </div>
    `),
    'multiple collections, combined with a non colleciton on the same levels'
  )
  t.end()
})
