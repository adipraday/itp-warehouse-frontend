// Deklarasi minimal Web Bluetooth API — TypeScript lib bawaan (`DOM`) belum menyediakan tipe
// resmi buat API ini (masih draft W3C, belum standar penuh). Cuma subset kecil yang benar-benar
// dipakai di `SalesReceiptModal.tsx` (§19 frontend-integration-guide.md, cetak struk ESC/POS).
// `navigator.bluetooth` sengaja opsional (`?`) — browser yang tidak mendukung (Safari/iOS, dll)
// tidak akan punya properti ini sama sekali, bukan `undefined` yang error kalau diakses.
interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer
}

interface RequestDeviceOptions {
  filters?: { services?: string[]; name?: string; namePrefix?: string }[]
  acceptAllDevices?: boolean
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  readonly bluetooth?: Bluetooth
}
