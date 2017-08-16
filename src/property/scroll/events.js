import ScrollManager from './manager'
import prefix from '../style/prefix'

const transform = prefix.transform || 'transform'
const deltasLastIndex = 2
const abs = Math.abs

var frameBlocked
const unblockFrame = () => { frameBlocked = null }
const blockFrame = () => { frameBlocked = global.requestAnimationFrame(unblockFrame) }

const prepareScroll = (manager, target) => {
  if (manager.isScrolling) {
    global.cancelAnimationFrame(manager.isScrolling)
    global.clearTimeout(manager.isScrolling)
  }
  // we might remove this
  if (target && target !== manager.currentTarget) {
    manager.currentTarget = target
    manager.target = false
  }
  manager.target = manager.getTarget(manager)
  manager.scrollDelta = manager.getOffsetSize(manager) - manager.getScrollSize(manager)
  manager.style = manager.target.style
  manager.isScrolling = false

  // this is to reset scroll when this node gets cloned
  // should make a more generic way of doing this
  if (!manager.target.hasOwnProperty('cloneNode')) {
    const cloneNode = manager.target.cloneNode
    const transform = manager.style[transform] || null
    manager.target.cloneNode = function (deep) {
      this.style.transform = transform
      return cloneNode.call(this, deep)
    }
  }
}

const setScroll = (manager, position) => {
  if (position > 0) {
    position = 0
  } else if (position < manager.scrollDelta) {
    position = manager.scrollDelta
  }
  const delta = position - manager.position
  if (delta) {
    manager.delta = delta
    manager.position = position
    manager.style[transform] = manager.direction === 'y'
    ? `translate3d(0, ${position}px, 0)`
    : `translate3d(${position}px, 0, 0)`
    return delta
  }
}

const touchStart = ({ target, event }) => {
  const manager = target.scrollManager || new ScrollManager(target)
  const e = event.changedTouches[0]
  if (manager.direction === 'y') {
    manager.clientPos = e.clientY
    manager.oppositePos = e.clientX
  } else {
    manager.clientPos = e.clientX
    manager.oppositePos = e.clientY
  }
  blockFrame()
  prepareScroll(manager, target)
}

const attemptScroll = (manager, e, delta) => {
  if (manager.scrollDelta < 0) {
    if (!manager.isScrolling) {
      let oppositeDelta
      if ('changedTouches' in e) {
        oppositeDelta = manager.direction === 'y'
        ? e.changedTouches[0].clientX - manager.oppositePos
        : e.changedTouches[0].clientY - manager.oppositePos
      } else {
        oppositeDelta = manager.direction === 'y'
        ? e.deltaX
        : e.deltaY
      }
      if (abs(delta) > abs(oppositeDelta)) {
        manager.position = manager.position || 0
        manager.deltasIndex = 0
        manager.deltas = [0,0,0]
        manager.isScrolling = true
      } else {
        manager.scrollDelta = false
        return
      }
    }

    delta = setScroll(manager, manager.position + delta)

    if (delta) {
      const deltasIndex = manager.deltasIndex
      manager.timeStamp = e.timeStamp
      manager.deltasIndex = deltasIndex === deltasLastIndex ? 0 : deltasIndex + 1
      manager.deltas[deltasIndex] = delta
      if ('onScroll' in manager) manager.onScroll(manager)
      e.preventDefault()
      return delta
    }
  }
}

const touchMove = e => {
  if (frameBlocked) return
  const manager = e.currentTarget.scrollManager
  if (manager.scrollDelta < 0) {
    const clientPos = manager.direction === 'y'
      ? e.changedTouches[0].clientY
      : e.changedTouches[0].clientX
    if (attemptScroll(manager, e, clientPos - manager.clientPos)) {
      blockFrame()
    }
    manager.clientPos = clientPos
  }
}

// t: current time, b: begInnIng value, c: change In value, d: duration
const easeOutCubic = (t, b, c, d) => c * ((t = t / d - 1) * t * t + 1) + b

const closestTo = (val, arr) => {
  var closest = arr[0]
  var delta = abs(closest - val)
  for (let i = 1, d; i < arr.length; i++) {
    d = abs(arr[i] - val)
    if (d < delta) {
      closest = arr[i]
      delta = d
    }
  }
  return closest
}
const touchEnd = ({ target, event }) => {
  const manager = target.scrollManager
  if (manager.isScrolling) {
    if (manager.snap) {
      let delta = 0
      let i = deltasLastIndex
      while (i >= 0) delta += manager.deltas[i--]
      delta = delta / (deltasLastIndex + 1) * 1.5

      let b, c
      let d = 20
      let t = 0

      const next = () => manager.isScrolling = setTimeout(scroll)
      var scroll = () => {
        delta = delta * 0.95
        b = manager.position
        c = closestTo(b, manager.snap) - b

        const snapDelta = c * (1 / d--)//(c = -b) / d--
        if (abs(snapDelta) > abs(delta)) {
          scroll = () => {
            if (t < d) {
              setScroll(manager, easeOutCubic(t++, b, c, d))
              manager.isScrolling = global.requestAnimationFrame(scroll)
              if ('onScroll' in manager) manager.onScroll(manager)
            } else {
              if ('onScrollEnd' in manager) manager.onScrollEnd(manager)
            }
          }
          return scroll()
        } else {
          delta = setScroll(manager, manager.position + delta)
        }
        if (delta > 0.5 || delta < -0.5) {
          manager.isScrolling = global.requestAnimationFrame(next)
          if ('onScroll' in manager) manager.onScroll(manager)
        } else if ('onScrollEnd' in manager) {
          manager.isScrolling = false
          manager.onScrollEnd(manager)
        }
      }
      scroll()
    } else if (event.timeStamp - manager.timeStamp < 100) {
      let delta = 0
      let i = deltasLastIndex
      while (i >= 0) delta += manager.deltas[i--]
      delta = delta / (deltasLastIndex + 1) * 1.5
      const next = () => manager.isScrolling = setTimeout(scroll)
      const scroll = () => {
        delta = setScroll(manager, manager.position + delta * 0.95)
        if (delta > 0.5 || delta < -0.5) {
          manager.isScrolling = global.requestAnimationFrame(next)
          if ('onScroll' in manager) manager.onScroll(manager)
        } else if ('onScrollEnd' in manager) {
          manager.isScrolling = false
          manager.onScrollEnd(manager)
        }
      }
      scroll()
    } else if ('onScrollEnd' in manager) {
      manager.isScrolling = false
      manager.onScrollEnd(manager)
    }
  }
}

const wheel = ({ target, event }) => {
  const manager = target.scrollManager || new ScrollManager(target)
  if (!manager.isScrolling && event.timeStamp - manager.timeStamp > 100) {
    manager.timeStamp = event.timeStamp
    prepareScroll(manager, target)
  }
  if (attemptScroll(manager, event, manager.direction === 'y' ? -event.deltaY : -event.deltaX)) {
    if ('onScrollEnd' in manager) {
      // is this caching needed?
      if (!('_cachedScrollEnd' in manager)) {
        manager._cachedScrollEnd = () => {
          manager.isScrolling = false
          manager.onScrollEnd(manager)
        }
      } else {
        clearTimeout(manager.isScrolling)
      }
      manager.isScrolling = setTimeout(manager._cachedScrollEnd, 100)
    }
  }
}

const scrollTo = (target, position, animate) => {
  const manager = target.scrollManager || new ScrollManager(target)
  prepareScroll(manager)
  setScroll(manager, position)
}

export { scrollTo, touchStart, touchMove, touchEnd, wheel }
