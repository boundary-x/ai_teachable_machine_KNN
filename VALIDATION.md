# 구현 및 검증 결과

검증일: 2026-09-11

## 구현 범위

- ml5 0.12.2 / p5.js 0.9.0 유지
- 이름 입력 제거, ID 자동 증가, 삭제한 ID 재사용 방지
- JSON 다운로드, Web Share API 파일 공유, 미지원 시 다운로드 대체
- JSON 검증 후 임시 분류기에 복원하고 현재 데이터 교체
- ID·샘플·다음 ID·좌우 반전 설정 복원
- 모바일 헤더와 돌아가기 버튼, 학습 버튼 가로 화면 레이아웃 수정
- 클릭·터치 1개 수집 및 hold 반복 수집, 취소 처리
- 학습/추론 임시 텐서 해제, 중지된 추론 무시
- 기존 UART 포맷 유지, 성공한 전송에만 완료 표시

## 자동 검증

Windows의 headless Microsoft Edge와 Playwright로 20개 검증 항목을 통과했습니다.
실제 CDN의 ml5 0.12.2 및 실제 MobileNet을 불러왔으며 카메라는 브라우저의 가상 장치를 사용했습니다.

1. 실제 라이브러리와 MobileNet 초기화
2. 마우스 클릭 1회 = 샘플 1개
3. 키보드 Enter 입력
4. hold 반복 및 release 후 정지
5. pointercancel 후 정지
6. Chromium 터치 입력을 통한 tap/hold 및 중복 수집 방지
7. 삭제한 ID 재사용 방지 및 샘플 없는 클래스 유지
8. 중간 ID 삭제 후 저장·복원 전후 동일 특징 입력의 예측 ID·클래스별 신뢰도·샘플 수 일치
9. 실제 JSON 파일 다운로드
10. 파일 가져오기 후 빈 ID·샘플 수·반전·다음 ID 복원
11. 손상 JSON, 잘못된 버전/엔진/shape/숫자/다음 ID, 중복 ID 거부 및 기존 데이터 유지
12. 임시 분류기 복원 실패 시 기존 데이터 유지
13. 파일 공유 미지원 시 다운로드
14. 파일 공유에 실제 File 객체 전달 및 사용자 활성화 유지
15. 공유 취소 후 컨트롤 복구
16. 빠른 시작·중지 및 중지된 추론의 화면 갱신 방지
17. 추가 샘플 40개 수집 전후 텐서 개수 유지
18. 진행 중인 UART 쓰기 이후 stop 순서 보장 및 중복 중지 처리
19. 320/360/390/430/768/844/1280px에서 가로 넘침, 돌아가기 버튼 줄바꿈, 헤더/카메라 겹침, 학습 텍스트 줄바꿈 검사
20. 처리되지 않은 브라우저 오류 없음

390px 세로, 844px 가로, 1280px 데스크톱 화면 캡처를 직접 확인했습니다.
가로 화면 학습 버튼의 기존 flex 충돌은 화면 검토 중 발견하여 수정하고 재검증했습니다.

추가로 모델 다운로드를 차단한 오류 시나리오에서 오류 안내가 카메라 준비 메시지에 덮어써지지 않고,
인식은 비활성화되며 파일 가져오기는 사용할 수 있음을 별도 검증했습니다.

## 확인된 기존 라이브러리 문제와 대응

ml5 0.12.2의 기본 load()로 데이터셋을 불러오면 하위 KNN의 라벨 매핑이 초기화되지 않아 결과 라벨이 내부 번호로 나오는 경우가 실제 테스트에서 확인됐습니다.
복원은 저장한 특징 벡터를 addExample()로 등록하여 라벨 메타데이터를 함께 생성합니다.
표시 ID는 보존하되 내부 인덱스는 달라질 수 있으므로 테스트도 표시 ID와 클래스별 신뢰도를 비교합니다.

## 검증 한계

- 실제 스마트폰의 OS 공유창, 메일 첨부·발송은 실행하지 않았습니다. 공유 지원/미지원/취소 경계는 모의 API로 검증했습니다.
- 실물 카메라의 화질이나 이미지 분류 정확도는 측정하지 않았습니다.
- 실물 micro:bit는 연결하지 않았습니다. UART 쓰기 순서와 표시 로직은 모의 장치로 검증했습니다.
- 40개 추가 샘플의 임시 텐서 누수는 확인했지만, 모든 스마트폰의 장시간 실행 성능을 보장하는 부하 테스트는 아닙니다.
- 이 문서는 로컬 검증 결과입니다. 실제 배포 상태와 기기 동작은 별도로 확인합니다.

## In-app support validation

All 14 walkthrough steps, chapter jumps, optional device skip, focus return, Escape dismissal, and data preservation passed at seven viewport sizes (320, 360, 390, 430, 768, 844, 1280 pixels). Existing 20 browser checks passed with real ml5 0.12.2 and MobileNet initialization using simulated camera input. Example URLs match the introduction page; physical micro:bit and servo behavior was not tested.

