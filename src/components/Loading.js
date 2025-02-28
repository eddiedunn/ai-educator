import Spinner from 'react-bootstrap/Spinner';

const Loading = () => {
    return (
        <div className='text-center my-5'>
            <Spinner animation="grow" style={{ color: 'var(--primary)' }} />
            <p className='my-2' style={{ color: 'var(--neutral-light)', fontFamily: 'DM Sans, sans-serif' }}>Loading Data...</p>
        </div>
    );
}

export default Loading
