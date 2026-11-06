// นาฬิกาของแอป — ที่เดียวในระบบที่เรียก Date.now() (logic/ รับเวลาเป็นพารามิเตอร์เสมอ)
// เจ้าของ: Takkan · Issue #9 · NFR-01 (ทดสอบด้วยนาฬิกาจำลอง) · ADR-8 (Demo mode)
//   createClock()               → นาฬิกาจริง: now() = เวลาของเครื่อง เลื่อนเวลาไม่ได้
//   createClock({ start: ms })  → นาฬิกาจำลอง: หยุดอยู่ที่ start จนกว่าจะเรียก advance / set (ใช้ในเทสต์และ Demo mode)

// นาฬิกาจริง
function realClock() {
  const refuse = () => { throw new Error('นาฬิกาจริงเลื่อนเวลาไม่ได้ — ใช้ createClock({ start }) ใน Demo mode / เทสต์'); };
  return { simulated: false, now: () => Date.now(), advance: refuse, set: refuse, subscribe: () => () => {} };
}

// นาฬิกาจำลอง — เวลาเดินเฉพาะเมื่อสั่ง · แจ้งผู้ฟังทุกครั้งที่เวลาเปลี่ยน (ให้หน้าจอ Demo วาดใหม่)
function simulatedClock(start) {
  let current = start;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn(current));

  return {
    simulated: true,
    now: () => current,
    // เลื่อนไปข้างหน้า ms มิลลิวินาที (ห้ามติดลบ — ย้อนเวลาทำให้สถานะที่บันทึกแล้วขัดกัน)
    advance(ms) {
      if (!Number.isFinite(ms) || ms < 0) throw new RangeError('advance ต้องเป็นจำนวน ms ที่ไม่ติดลบ');
      current += ms;
      notify();
      return current;
    },
    // ไปที่เวลา ms (เดินหน้าอย่างเดียว เหมือนนาฬิกาจริง)
    set(ms) {
      if (!Number.isFinite(ms)) throw new TypeError('set ต้องรับเวลาเป็น ms');
      if (ms < current) throw new RangeError('นาฬิกาจำลองย้อนเวลาไม่ได้ — สร้างนาฬิกาใหม่เพื่อเริ่มใหม่');
      current = ms;
      notify();
      return current;
    },
    // ฟังการเปลี่ยนเวลา → คืนฟังก์ชันเลิกฟัง
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function createClock({ start } = {}) {
  if (start === undefined) return realClock();
  if (!Number.isFinite(start)) throw new TypeError('start ต้องเป็นเวลา ms');
  return simulatedClock(start);
}
