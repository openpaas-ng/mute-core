import {
  Dot,
  Identifier,
  IdentifierInterval,
  IdentifierTuple,
  LogootSAdd,
  LogootSDel,
} from 'mute-structs'

import { sync } from '../src/proto'
import { RichLogootSOperation, StateVector } from '../src/sync'

export function generateSequentialRichLogootSOps(): RichLogootSOperation[] {
  const replicaNumber = 0
  const clock = 0
  const tuple1 = new IdentifierTuple(0, replicaNumber, clock, 0)
  const tuple2 = IdentifierTuple.fromBase(tuple1, 5)

  const id1 = new Identifier([tuple1])
  const insertOp1 = new LogootSAdd(id1, 'hello')
  const richLogootSOp1 = new RichLogootSOperation(replicaNumber, clock, insertOp1)

  const id2 = new Identifier([tuple2])
  const insertOp2 = new LogootSAdd(id2, ' world')
  const richLogootSOp2 = new RichLogootSOperation(replicaNumber, clock + 1, insertOp2)

  const otherReplicaNumber = 1
  const otherClock = 0
  const id3 = Identifier.fromBase(id1, 3)
  const idInterval1 = new IdentifierInterval(id3, 7)
  const deleteOp1 = new LogootSDel([idInterval1], 0)
  const dependencies = [{ replicaNumber, clock: clock + 1 }] as Dot[]
  const richLogootSOp3 = new RichLogootSOperation(
    otherReplicaNumber,
    otherClock,
    deleteOp1,
    dependencies
  )

  return [richLogootSOp1, richLogootSOp2, richLogootSOp3]
}

export function generateCausalRichLogootSOps(): RichLogootSOperation[] {
  const replicaNumberA = 0
  const clockA = 0
  const tuple1 = new IdentifierTuple(0, replicaNumberA, clockA, 0)

  const id1 = new Identifier([tuple1])
  const insertOp1 = new LogootSAdd(id1, 'hello')
  const richLogootSOp1 = new RichLogootSOperation(replicaNumberA, clockA, insertOp1)

  const replicaNumberB = 2
  const clockB = 0
  const id2 = Identifier.fromBase(id1, 4) // 'o'
  const idInterval1 = new IdentifierInterval(id2, 4) // 'o'
  const deleteOp1 = new LogootSDel([idInterval1], 0)
  const dependencies = [{ replicaNumber: replicaNumberA, clock: clockA }] as Dot[]
  const richLogootSOp2 = new RichLogootSOperation(replicaNumberB, clockB, deleteOp1, dependencies)

  return [richLogootSOp1, richLogootSOp2]
}

export function generateVector(): StateVector {
  const vector = new Map<number, number>()
  vector.set(0, 42)
  vector.set(1, 10)
  vector.set(53, 1)

  return new StateVector(vector)
}

export function generateQuerySyncMsg(vector: StateVector) {
  const querySyncMsg = sync.QuerySyncMsg.create()

  vector.forEach((clock, id) => {
    if (id !== undefined && clock !== undefined) {
      querySyncMsg.vector[id] = clock
    }
  })

  return sync.SyncMsg.encode(sync.SyncMsg.create({ querySync: querySyncMsg })).finish()
}
