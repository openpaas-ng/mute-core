import { Identifier, LogootSOperation, LogootSRopes, TextOperation } from 'mute-structs'
import { Observable, Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

import { ICollaborator } from '../collaborators'
import { Disposable } from '../Disposable'
import { sync } from '../proto'

export interface Position {
  id: Identifier
  index: number
}

export class DocService extends Disposable {
  private doc: LogootSRopes
  private docDigestSubject: Subject<number>
  private docTreeSubject: Subject<string>
  private localLogootSOperationSubject: Subject<LogootSOperation>
  private remoteTextOperationsSubject: Subject<{
    collaborator: ICollaborator | undefined
    operations: TextOperation[]
  }>
  private updateSubject: Subject<void>

  constructor(id: number) {
    super()
    this.doc = new LogootSRopes(id)

    this.docDigestSubject = new Subject()
    this.docTreeSubject = new Subject()
    this.localLogootSOperationSubject = new Subject()
    this.remoteTextOperationsSubject = new Subject()
    this.updateSubject = new Subject()

    this.newSub = this.updateSubject.pipe(debounceTime(1000)).subscribe(() => {
      this.docTreeSubject.next(JSON.stringify(this.doc))
      this.docDigestSubject.next(this.doc.digest())
    })
  }

  set localTextOperationsSource(source: Observable<TextOperation[]>) {
    this.newSub = source.subscribe((textOperations: TextOperation[]) => {
      this.handleTextOperations(textOperations)
      this.updateSubject.next()
    })
  }

  set remoteLogootSOperationSource(
    source: Observable<{
      collaborator: ICollaborator | undefined
      operations: LogootSOperation[]
    }>
  ) {
    this.newSub = source.subscribe(({ collaborator, operations }) => {
      const remoteTextOps: TextOperation[] = operations
        .map((op) => this.handleRemoteOperation(op))
        .reduce((acc: TextOperation[], textOps: TextOperation[]) => acc.concat(textOps), [])
      this.remoteTextOperationsSubject.next({
        collaborator,
        operations: remoteTextOps,
      })
      this.updateSubject.next()
    })
  }

  get onDocDigest(): Observable<number> {
    return this.docDigestSubject.asObservable()
  }

  get onDocTree(): Observable<string> {
    return this.docTreeSubject.asObservable()
  }

  get onLocalLogootSOperation(): Observable<LogootSOperation> {
    return this.localLogootSOperationSubject.asObservable()
  }

  get onRemoteTextOperations(): Observable<{
    collaborator: ICollaborator | undefined
    operations: TextOperation[]
  }> {
    return this.remoteTextOperationsSubject.asObservable()
  }

  dispose(): void {
    this.localLogootSOperationSubject.complete()
    this.remoteTextOperationsSubject.complete()
    this.updateSubject.complete()
    super.dispose()
  }

  handleTextOperations(textOperations: TextOperation[]): void {
    textOperations.forEach((textOperation: TextOperation) => {
      const logootSOperation: LogootSOperation = textOperation.applyTo(this.doc)
      this.localLogootSOperationSubject.next(logootSOperation)
    })
    // log.info('operation:doc', 'updated doc: ', this.doc)
  }

  handleRemoteOperation(logootSOperation: LogootSOperation): TextOperation[] {
    const textOperations: TextOperation[] = logootSOperation.execute(this.doc)
    // log.info('operation:doc', 'updated doc: ', this.doc)
    return textOperations
  }

  positionFromIndex(index: number): Position | undefined {
    const respIntnode = this.doc.searchNode(index)
    if (respIntnode !== null) {
      const offset = respIntnode.node.actualBegin + respIntnode.i
      const id = Identifier.fromBase(respIntnode.node.getIdBegin(), offset)
      return {
        id,
        index: respIntnode.i,
      }
    }
    return undefined
  }

  indexFromId(id: sync.IdentifierMsg): number {
    return this.doc.searchPos(Identifier.fromPlain(id), new Array())
  }
}
