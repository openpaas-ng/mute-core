import test from 'ava'
import { Subject } from 'rxjs'
import { map } from 'rxjs/operators'

import { LogootSRopes } from 'mute-structs'
import { CollaboratorsService } from '../src/collaborators'
import { IMessageIn, IMessageOut } from '../src/misc'
import { RichLogootSOperation, State, Sync } from '../src/sync'
import { generateCausalRichLogootSOps, generateSequentialRichLogootSOps } from './Helpers'

test('deliver-operations-in-sequential-order', (context) => {
  const cs = new CollaboratorsService(new Subject<IMessageIn>(), new Subject<IMessageOut>(), {
    id: 0,
  })

  const richLogootSOps = generateSequentialRichLogootSOps()
  const [firstRichLogootSOp, ...tailRichLogootSOps] = richLogootSOps
  const sync = new Sync(0, new State(new Map(), [], new LogootSRopes(0), 0, 0), cs)

  const remoteRichLogootSOpSubject = new Subject<RichLogootSOperation>()
  sync.remoteRichLogootSOperations$ = remoteRichLogootSOpSubject

  tailRichLogootSOps.forEach((op) => {
    remoteRichLogootSOpSubject.next(op)
  })
  setTimeout(() => {
    remoteRichLogootSOpSubject.next(firstRichLogootSOp)
    setTimeout(() => {
      cs.dispose()
      sync.dispose()
    }, 100)
  })

  let counter = 0
  context.plan(richLogootSOps.length * 2)
  return sync.remoteLogootSOperations$.pipe(
    map(({ operations }) => {
      context.is(operations.length, 1)
      context.deepEqual(operations, [richLogootSOps[counter++].logootSOp])
    })
  )
})

test('deliver-operations-in-causal-order', (context) => {
  const cs = new CollaboratorsService(new Subject<IMessageIn>(), new Subject<IMessageOut>(), {
    id: 0,
  })
  const richLogootSOps = generateCausalRichLogootSOps()
  const [firstRichLogootSOp, secondRichLogootSOp] = richLogootSOps
  const sync = new Sync(0, new State(new Map(), [], new LogootSRopes(0), 0, 0), cs)

  const remoteRichLogootSOpSubject = new Subject<RichLogootSOperation>()

  sync.remoteRichLogootSOperations$ = remoteRichLogootSOpSubject
  remoteRichLogootSOpSubject.next(secondRichLogootSOp)
  setTimeout(() => {
    remoteRichLogootSOpSubject.next(firstRichLogootSOp)
    setTimeout(() => {
      cs.dispose()
      sync.dispose()
    }, 100)
  })

  let counter = 0
  context.plan(richLogootSOps.length * 2)
  sync.remoteLogootSOperations$.subscribe((o) => console.log(o))
  return sync.remoteLogootSOperations$.pipe(
    map(({ operations }) => {
      context.is(operations.length, 1)
      context.deepEqual(operations, [richLogootSOps[counter++].logootSOp])
    })
  )
})
