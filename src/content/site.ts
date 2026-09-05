/**
 * All user-facing landing copy lives here so the marketing text can be revised
 * without touching layout code. Every string is original ViralCut copy.
 */

export const site = {
  name: 'ViralCut',
  nameKo: '바이럴컷',
  domain: 'viralcut.video',
  tagline: '영상을 다시 태어나게',
  supportEmail: 'help@viralcut.video',
} as const;

export const nav = [
  { label: '재구성', href: '/#reconstruct' },
  { label: '기능', href: '/#features' },
  { label: '사용 가이드', href: '/guide' },
  { label: 'FAQ', href: '/faq' },
] as const;

/** Hero trust chips — three claims, three different kinds of proof. */
export const heroBadges = [
  { label: '완전 무료', detail: '결제 수단 등록 없음' },
  { label: '워터마크 없음', detail: '상업적 이용 가능' },
  { label: '1분~28분', detail: '길이 자유 조정' },
] as const;

export const heroStats = [
  { value: '2가지', label: '제작 모드', sub: '쇼츠 · 재구성' },
  { value: '28분', label: '최대 결과물 길이', sub: '1분 단위 조정' },
  { value: '0원', label: '이용 요금', sub: '크레딧 없음' },
] as const;

export const genres = [
  {
    id: 'lecture',
    label: '강의 · 교육',
    accent: 'mint',
    headline: '핵심 개념만 남기고 군더더기는 덜어냅니다',
    detail:
      '설명이 늘어지는 구간을 접고, 판서나 슬라이드가 바뀌는 순간을 기준으로 챕터를 나눕니다. 용어에는 자동으로 강조 자막이 붙습니다.',
  },
  {
    id: 'interview',
    label: '인터뷰 · 토크',
    accent: 'brand',
    headline: '말이 오가는 리듬을 그대로 살립니다',
    detail:
      '화자가 바뀌는 지점을 인식해 시선이 따라가도록 프레임을 옮기고, 웃음이나 정적 같은 반응 구간을 살려 편집합니다.',
  },
  {
    id: 'review',
    label: '리뷰 · 정보',
    accent: 'coral',
    headline: '결론부터 보여주는 구조로 다시 짭니다',
    detail:
      '가격, 스펙, 평가처럼 시청자가 찾는 정보를 먼저 배치하고 근거 장면을 뒤에 붙입니다. 수치는 자막 카드로 정리됩니다.',
  },
  {
    id: 'gaming',
    label: '게임 · 스트리밍',
    accent: 'brand',
    headline: '몇 시간짜리 방송에서 한 판만 뽑아냅니다',
    detail:
      '함성이나 채팅이 몰리는 구간, 화면 전환이 격해지는 구간을 신호로 삼아 하이라이트를 찾습니다. 대기 시간은 통째로 잘려나갑니다.',
  },
  {
    id: 'vlog',
    label: '브이로그 · 일상',
    accent: 'coral',
    headline: '하루의 흐름을 끊지 않고 압축합니다',
    detail:
      '이동이나 준비 장면은 빠르게 넘기고 표정과 대화가 살아있는 순간에 머무릅니다. 배경 음악은 장면 온도에 맞춰 교체됩니다.',
  },
] as const;

export type Genre = (typeof genres)[number];

/** Step-by-step for the shorts pipeline (landing "how it works"). */
export const workflow = [
  {
    step: '01',
    title: '주소를 붙여넣거나 파일을 올립니다',
    detail:
      '유튜브 링크 한 줄이면 충분합니다. 손에 있는 mp4·mov 파일을 그대로 올려도 됩니다.',
  },
  {
    step: '02',
    title: '만들 방식을 고릅니다',
    detail:
      '하이라이트를 잘라 쇼츠를 뽑을지, 목소리와 자막까지 새로 입혀 재구성할지 선택합니다.',
  },
  {
    step: '03',
    title: '결과물을 받아 바로 씁니다',
    detail:
      '완성된 영상을 내려받거나 자막 파일만 따로 챙기세요. 마음에 안 들면 다시 돌려도 요금은 없습니다.',
  },
] as const;

export const features = [
  {
    icon: 'Sparkles',
    title: '하이라이트 자동 탐색',
    detail:
      '말의 밀도, 화면 변화, 감정 표현을 함께 보고 사람이 멈춰 볼 만한 구간을 찾아냅니다.',
  },
  {
    icon: 'Captions',
    title: '프레임 단위 자막',
    detail:
      '음성을 받아쓰고 호흡에 맞춰 줄을 나눕니다. 강조할 단어에는 색과 크기를 다르게 줍니다.',
  },
  {
    icon: 'Scissors',
    title: '군더더기 구간 정리',
    detail:
      '숨 고르는 공백, 반복되는 추임새, 말이 꼬인 부분을 걷어내 속도감을 만듭니다.',
  },
  {
    icon: 'Zap',
    title: '도입부 재배치',
    detail:
      '가장 강한 장면을 맨 앞으로 끌어와 처음 몇 초 안에 결론이 드러나도록 순서를 바꿉니다.',
  },
  {
    icon: 'ScanFace',
    title: '화자 추적 리프레이밍',
    detail:
      '가로 영상을 세로로 옮길 때 말하는 사람을 따라가며 잘라내 인물이 화면 밖으로 나가지 않습니다.',
  },
  {
    icon: 'AudioLines',
    title: '음성 정리',
    detail:
      '잡음과 웅웅거림을 걷어내고 구간별 음량 차이를 고르게 맞춥니다.',
  },
  {
    icon: 'Palette',
    title: '자막 템플릿',
    detail:
      '서체, 색, 등장 방식이 미리 짜인 템플릿을 고르면 전체 자막에 한 번에 적용됩니다.',
  },
  {
    icon: 'FileDown',
    title: '원하는 형태로 내보내기',
    detail:
      '완성 영상은 물론 자막(SRT)과 대본(TXT)만 따로 받을 수 있습니다. 워터마크는 없습니다.',
  },
] as const;

/** The differentiator. Deliberately spelled out step by step on the landing page. */
export const reconstructSteps = [
  {
    key: 'strip',
    title: '원본 소리와 자막을 걷어냅니다',
    detail:
      '음성 트랙에서 목소리와 배경음을 분리해 양쪽 다 제거합니다. 별도 자막 트랙은 삭제하고, 화면에 박힌 자막은 위치를 찾아 가려냅니다.',
  },
  {
    key: 'script',
    title: '내용을 이해하고 대본을 새로 씁니다',
    detail:
      '원본에서 받아쓴 내용을 바탕으로, 정한 길이에 맞는 분량의 대본을 새로 씁니다. 사실관계는 원본을 따라가되 문장과 흐름은 새로 만듭니다.',
  },
  {
    key: 'voice',
    title: '새 목소리를 입힙니다',
    detail:
      '고른 목소리로 대본을 읽어 내레이션을 만듭니다. 말 속도와 쉬는 지점은 화면 전환에 맞춰 조정됩니다.',
  },
  {
    key: 'sound',
    title: '효과음과 배경음을 새로 깝니다',
    detail:
      '장면이 바뀌는 지점에 전환음을, 강조 구간에 포인트 효과음을 넣습니다. 배경음악은 내레이션에 묻히지 않도록 자동으로 눌러줍니다.',
  },
  {
    key: 'caption',
    title: '자막을 새로 붙입니다',
    detail:
      '새로 만든 내레이션에 맞춰 자막 타이밍을 계산합니다. 원본 자막과는 완전히 별개의 새 자막입니다.',
  },
  {
    key: 'render',
    title: '정한 길이로 맞춰 렌더링합니다',
    detail:
      '1분에서 28분 사이로 정한 길이에 맞춰 장면을 고르고 붙여 한 편의 영상으로 만들어냅니다.',
  },
] as const;

export const personas = [
  {
    role: '유튜브 크리에이터',
    pain: '롱폼 하나 올리고 나면 진이 빠져서 쇼츠까지 손댈 여력이 없습니다. 편집자를 쓰자니 비용이 만만치 않고요.',
    wins: ['영상 한 편에서 여러 편', '편집 시간 대폭 절약'],
  },
  {
    role: '강사 · 1인 사업자',
    pain: '강의랑 상담 녹화본은 계속 쌓이는데, 홍보용으로 다듬을 시간이 없어 그냥 묵혀둡니다.',
    wins: ['녹화본을 홍보 소재로', '자막 작업 자동화'],
  },
  {
    role: '마케팅 대행사',
    pain: '클라이언트마다 톤이 달라서 매번 처음부터 편집합니다. 계정이 늘어날수록 사람이 더 필요해집니다.',
    wins: ['여러 건 동시 처리', '톤 설정 저장해 재사용'],
  },
  {
    role: '사내 홍보 담당자',
    pain: '행사 영상은 매번 찍는데 편집할 사람이 없어 결국 원본을 그대로 올립니다.',
    wins: ['편집 경험 없이도 완성', '플랫폼별 비율 동시 출력'],
  },
] as const;

export const testimonials = [
  {
    quote:
      '재구성 기능을 처음 써봤을 때가 기억납니다. 예전 영상 화면은 그대로인데 설명이 완전히 새로 입혀져 나와서, 다시 찍은 줄 알았습니다.',
    author: '교육 채널 운영',
    context: '강의 영상 재활용',
  },
  {
    quote:
      '두 시간짜리 방송에서 쓸 만한 장면을 직접 찾는 게 제일 괴로웠는데, 그 작업이 통째로 사라졌습니다.',
    author: '게임 스트리머',
    context: '방송 다시보기 정리',
  },
  {
    quote:
      '자막 타이밍이 어긋나면 결국 손으로 고치게 되는데, 여기 결과물은 그대로 써도 어색하지 않았습니다.',
    author: '리뷰 채널 운영',
    context: '자막 작업 대체',
  },
  {
    quote:
      '무료라길래 품질은 기대 안 했습니다. 실제로 써보고 팀 전체가 쓰기로 정했습니다.',
    author: '마케팅 대행사',
    context: '클라이언트 숏폼 제작',
  },
] as const;

export const extras = [
  {
    icon: 'Languages',
    title: '다국어 자막',
    detail:
      '완성된 자막을 다른 언어로 옮겨 함께 내보냅니다. 제목과 설명도 같이 번역됩니다.',
  },
  {
    icon: 'LayoutTemplate',
    title: '비율 동시 출력',
    detail:
      '세로 9:16, 정사각 1:1, 가로 16:9를 한 번에 뽑아 플랫폼별로 따로 만들 필요가 없습니다.',
  },
  {
    icon: 'ListVideo',
    title: '작업 기록 보관',
    detail:
      '지난 결과물과 설정이 그대로 남아 있어, 같은 톤으로 다시 만들 때 설정을 불러오면 됩니다.',
  },
] as const;

export const faqs = [
  {
    q: '정말 무료인가요? 나중에 요금이 생기나요?',
    a: '지금은 전면 무료입니다. 크레딧이나 이용권 개념 자체가 없고 결제 수단을 등록할 필요도 없습니다. 회원가입만 하면 모든 기능을 제한 없이 쓸 수 있습니다.',
  },
  {
    q: '재구성 기능은 정확히 무엇을 바꾸나요?',
    a: '원본에서 화면만 남기고 소리와 자막을 전부 새로 만듭니다. 원본 목소리와 배경음·효과음을 분리해 제거하고, 내용을 이해한 뒤 대본을 새로 써서 새 목소리로 읽고, 효과음과 배경음악을 새로 깔고, 그에 맞는 자막을 새로 붙입니다. 결과물은 완성된 영상 파일로 나옵니다.',
  },
  {
    q: '결과물 길이는 어떻게 정하나요?',
    a: '재구성 화면의 길이 조절기에서 1분부터 28분까지 1분 단위로 정할 수 있습니다. 정한 길이에 맞춰 어떤 장면을 남기고 어떤 장면을 접을지, 대본을 몇 자로 쓸지가 함께 결정됩니다.',
  },
  {
    q: '화면에 박혀 있는 자막도 지워지나요?',
    a: '완전히 지울 수는 없습니다. 영상 화면에 픽셀로 새겨진 자막은 제거하면 그 자리가 비어버리기 때문입니다. 대신 자막이 있는 영역을 찾아 흐리게 처리하거나 잘라내고, 그 위에 새 자막을 덮는 방식으로 처리합니다. 자막이 별도 트랙으로 들어 있는 영상은 흔적 없이 제거됩니다.',
  },
  {
    q: '쇼츠는 몇 개나 만들어지나요?',
    a: '원본 길이와 내용에 따라 다릅니다. 쓸 만한 구간이 나올 때만 만들기 때문에, 같은 길이여도 영상에 따라 개수가 달라집니다. 만들어진 것 중에 원하는 것만 골라 받으면 됩니다.',
  },
  {
    q: '결과물을 상업적으로 써도 되나요?',
    a: '됩니다. 워터마크가 붙지 않고 사용 범위에 제한도 없습니다. 다만 원본 영상에 대한 권리는 직접 확보하셔야 합니다. 본인이 만들었거나 이용 허락을 받은 영상만 올려주세요.',
  },
  {
    q: '올린 영상은 어떻게 관리되나요?',
    a: '작업에 필요한 동안만 서버에 두고, 완료 후 일정 기간이 지나면 원본과 중간 파일을 삭제합니다. 프로젝트 화면에서 직접 지우면 그 즉시 삭제됩니다.',
  },
  {
    q: '얼마나 걸리나요?',
    a: '영상 길이와 고른 모드에 따라 다릅니다. 재구성은 소리를 통째로 새로 만들기 때문에 쇼츠 추출보다 오래 걸립니다. 진행 상황은 프로젝트 화면에서 단계별로 확인할 수 있고, 창을 닫아도 작업은 계속됩니다.',
  },
] as const;

export const footerGroups = [
  {
    title: '제작',
    links: [
      { label: '쇼츠 만들기', href: '/app/new?mode=shorts' },
      { label: '영상 재구성', href: '/app/new?mode=reconstruct' },
      { label: '내 프로젝트', href: '/app' },
    ],
  },
  {
    title: '알아보기',
    links: [
      { label: '사용 가이드', href: '/guide' },
      { label: '자주 묻는 질문', href: '/faq' },
      { label: '기능 살펴보기', href: '/#features' },
    ],
  },
  {
    title: '문의',
    links: [{ label: site.supportEmail, href: `mailto:${site.supportEmail}` }],
  },
] as const;
