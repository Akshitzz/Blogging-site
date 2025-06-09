const LoadMoreButton = ({state, fetchData, additionalParam}) => {
    // Add null checks and ensure state has required properties
    if(!state || !state.results || !state.totalDocs) {
        return null;
    }

    if(state.totalDocs > state.results.length) {
        return (
            <button
                onClick={() => fetchData({...additionalParam, page: state.page + 1})}
                className="text-dark-grey p2 px-3 hover:bg-grey/30 rounded-md flex items-center justify-center gap-2"
            >
                Load More
            </button>
        );
    }

    return null;
}

export default LoadMoreButton;
