/**
 * @author 
 * @author
 * 
 * RGBELoader는 RGBE (.hdr) 형식의 HDR 파일을 로드하여 THREE.DataTexture 형태로 반환합니다.
 * 이 예제는 기본 구조를 보여주며, 실제 사용 시에는 파일 헤더 파싱 및 픽셀 데이터 디코딩 로직이 추가되어야 합니다.
 */

THREE.RGBELoader = ( function () {

    // 생성자 함수
    function RGBELoader( manager ) {
      THREE.Loader.call( this, manager );
      this.type = THREE.UnsignedByteType; // 기본 데이터 타입 (필요에 따라 THREE.FloatType 등으로 변경)
    }
  
    // THREE.Loader를 상속받아 프로토타입 확장
    RGBELoader.prototype = Object.assign( Object.create( THREE.Loader.prototype ), {
  
      constructor: RGBELoader,
  
      /**
       * load: URL로부터 HDR 파일을 로드합니다.
       * @param {String} url - HDR 파일 경로
       * @param {Function} onLoad - 로드 완료 후 호출될 콜백 함수 (texture를 인자로 받음)
       * @param {Function} [onProgress] - 로드 진행 상태 콜백
       * @param {Function} [onError] - 로드 실패 시 호출될 콜백 함수
       */
      load: function ( url, onLoad, onProgress, onError ) {
        console.log("loading started")
        var scope = this;
        var loader = new THREE.FileLoader( this.manager );
        loader.setResponseType( 'arraybuffer' );
        loader.load( url, function ( buffer ) {
  
          onLoad( scope.parse( buffer ) );
  
        }, onProgress, onError );
  
      },
  
      /**
       * parse: ArrayBuffer 형태의 HDR 데이터를 파싱하여 THREE.DataTexture를 반환합니다.
       * @param {ArrayBuffer} buffer - 로드된 HDR 파일 데이터
       * @return {THREE.DataTexture} - 파싱된 텍스처
       */
      parse: function ( buffer ) {
  
        // 실제 구현에서는 HDR 파일 헤더를 파싱하고, RGBE 데이터를 해독하여 픽셀 데이터를 생성합니다.
        // 아래는 구조만 보여주는 예시 코드입니다.
  
        var byteArray = new Uint8Array( buffer );
  
        // 예시: 가상의 width, height 및 픽셀 데이터를 설정 (실제 파싱 로직 필요)
        var width = 512;
        var height = 256;
        var pixelData = new Uint8Array( width * height * 4 ); // RGBA 포맷
  
        // 실제 데이터 파싱 로직을 통해 pixelData에 값을 채워야 합니다.
        // (여기서는 모든 값을 128로 채워 예시로 사용)
        for ( var i = 0, il = pixelData.length; i < il; i ++ ) {
          pixelData[ i ] = 128;
        }
  
        var texture = new THREE.DataTexture( pixelData, width, height, THREE.RGBAFormat, this.type );
        texture.needsUpdate = true;
        texture.mapping = THREE.EquirectangularReflectionMapping;
  
        return texture;
  
      }
  
    } );
  
    return RGBELoader;
  
  } )();